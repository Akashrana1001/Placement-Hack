import { v4 as uuidv4 } from 'uuid';
import { Resume } from '../models/Resume.js';
import { PrepPlan } from '../models/PrepPlan.js';
import { MockInterview } from '../models/MockInterview.js';
import { addAgentJob } from '../queues/agentQueue.js';
import { extractTextFromFile } from '../middleware/upload.middleware.js';
import { ragService } from '../services/rag.service.js';

export const uploadResume = async (req, res, next) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText || typeof resumeText !== 'string' || resumeText.length < 50) {
      return res.status(400).json({ success: false, message: 'Resume text must be at least 50 characters.' });
    }
    
    // 1. Save raw resume to DB
    const resume = await Resume.create({
      userId: req.user._id,
      rawText: resumeText
    });

    // 2. Embed into FAISS for RAG retrieval (fire-and-forget — never blocks response)
    ragService.embedDocument(req.user._id.toString(), resumeText, 'resume').catch(() => {});

    // 3. Trigger Recon Agent
    const job = await addAgentJob({
      userId: req.user._id.toString(), // Ensure string
      agentType: 'recon',
      input: JSON.stringify({ resumeText }),
      sessionId: `sess-${uuidv4()}`
    });

    res.status(200).json({
      success: true,
      data: { jobId: job.id, resumeId: resume._id, message: "Resume analysis started." }
    });
  } catch (error) { next(error); }
};

// ── File Upload: PDF / DOCX / TXT ──────────────────────────────────────────
export const uploadResumeFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Send a PDF, DOCX, or TXT in the "resume" field.' });
    }
    const resumeText = await extractTextFromFile(req.file);
    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ success: false, message: 'Could not extract enough text. Ensure the file is not a scanned image.' });
    }
    const resume = await Resume.create({ userId: req.user._id, rawText: resumeText });
    ragService.embedDocument(req.user._id.toString(), resumeText, 'resume').catch(() => {});
    const job    = await addAgentJob({
      userId: req.user._id.toString(), agentType: 'recon',
      input: JSON.stringify({ resumeText }), sessionId: `sess-${uuidv4()}`
    });
    res.status(200).json({ success: true, data: {
      jobId: job.id, resumeId: resume._id,
      fileName: req.file.originalname, textLength: resumeText.length,
      message: `Parsed ${resumeText.length} chars from "${req.file.originalname}". Analysis started.`
    }});
  } catch (error) { next(error); }
};

export const getAnalysis = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!resume) return res.status(404).json({ success: false, message: "No resume found." });
    
    res.status(200).json({ success: true, data: resume });
  } catch (error) { next(error); }
};

export const getPlan = async (req, res, next) => {
  try {
    const plan = await PrepPlan.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ success: false, message: "No prep plan found." });
    
    res.status(200).json({ success: true, data: plan });
  } catch (error) { next(error); }
};

export const generatePlan = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!resume || !resume.gapReport) {
      return res.status(400).json({ success: false, message: "Analyze resume first to generate a gap report." });
    }

    const job = await addAgentJob({
      userId: req.user._id.toString(),
      agentType: 'strategy',
      input: JSON.stringify({ gapReport: resume.gapReport }),
      sessionId: `sess-${uuidv4()}`
    });

    res.status(200).json({ success: true, data: { jobId: job.id } });
  } catch (error) { next(error); }
};

export const startInterview = async (req, res, next) => {
  try {
    const { type, targetCompany } = req.body;
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const weakAreas = resume?.gapReport?.weakAreas || ["general technical skills"];

    const sessionId = `sess-${uuidv4()}`;
    const job = await addAgentJob({
      userId: req.user._id.toString(),
      agentType: 'arena',
      input: JSON.stringify({ command: "START_INTERVIEW", type, targetCompany, weakAreas }),
      sessionId
    });

    res.status(200).json({ success: true, data: { jobId: job.id, sessionId } });
  } catch (error) { next(error); }
};

export const submitAnswer = async (req, res, next) => {
  try {
    const { answer, sessionId } = req.body;
    if (!answer || !sessionId) {
      return res.status(400).json({ success: false, message: 'answer and sessionId are required.' });
    }
    
    const job = await addAgentJob({
      userId: req.user._id.toString(),
      agentType: 'arena',
      input: JSON.stringify({ command: "EVALUATE_ANSWER", answer }),
      sessionId // Crucial: Reuses the same session ID so the agent remembers the context
    });

    res.status(200).json({ success: true, data: { jobId: job.id } });
  } catch (error) { next(error); }
};

export const getInterviews = async (req, res, next) => {
  try {
    const interviews = await MockInterview.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ success: true, data: interviews });
  } catch (error) { next(error); }
};

export const getProgress = async (req, res, next) => {
  try {
    const [plan, interviews] = await Promise.all([
      PrepPlan.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      MockInterview.find({ userId: req.user._id }).lean(),
    ]);
    
    const avgScore = interviews.length > 0 
      ? interviews.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / interviews.length 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        planProgress: plan?.progress || null,
        avgInterviewScore: Math.round(avgScore * 10) / 10,
        riskScore: req.user.riskScore,
        totalInterviews: interviews.length
      }
    });
  } catch (error) { next(error); }
};