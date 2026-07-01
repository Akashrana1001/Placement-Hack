/**
 * interview.controller.js
 * Deterministic, zero-LLM interview engine.
 * Questions are picked from a curated bank in < 1ms.
 * Evaluation is keyword-matching — no Ollama needed.
 */
import { MockInterview } from '../models/MockInterview.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ── FULL QUESTION BANK ──────────────────────────────────────────────────────
const QUESTION_BANK = {
  technical: [
    { q: 'How does a HashMap handle collisions?', topic: 'dsa', expected: ['chaining', 'linked list', 'open addressing', 'load factor'] },
    { q: 'Explain the difference between BFS and DFS.', topic: 'dsa', expected: ['queue', 'stack', 'breadth', 'depth', 'traversal'] },
    { q: 'What is the time complexity of Merge Sort and why?', topic: 'dsa', expected: ['n log n', 'divide', 'merge', 'recursive'] },
    { q: 'What is the difference between an Interface and an Abstract Class in Java?', topic: 'java', expected: ['multiple inheritance', 'default methods', 'abstract', 'implement'] },
    { q: 'What are the four pillars of OOP?', topic: 'java', expected: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'] },
    { q: 'Explain the event loop in Node.js.', topic: 'webdev', expected: ['callback', 'queue', 'non-blocking', 'async', 'single thread'] },
    { q: 'What is the Virtual DOM in React and why is it useful?', topic: 'webdev', expected: ['diff', 'reconciliation', 'performance', 'real dom', 'render'] },
    { q: 'What is dynamic programming? Give a real-world example.', topic: 'dsa', expected: ['subproblem', 'memoization', 'optimal', 'overlapping'] },
    { q: 'How would you design a URL shortener like bit.ly?', topic: 'system-design', expected: ['hash', 'database', 'redirect', 'cache', 'collision'] },
    { q: 'What is load balancing? Name different strategies.', topic: 'system-design', expected: ['round robin', 'least connections', 'distribute', 'health check'] },
  ],
  hr: [
    { q: 'Tell me about a time you handled a conflict in a team.', topic: 'hr', expected: ['situation', 'action', 'result', 'resolved', 'communication'] },
    { q: 'Where do you see yourself in 5 years?', topic: 'hr', expected: ['growth', 'learning', 'technology', 'leadership', 'contribute'] },
    { q: 'Why should we hire you over other candidates?', topic: 'hr', expected: ['skill', 'passionate', 'value', 'team', 'unique'] },
    { q: 'Describe a challenging project and how you overcame it.', topic: 'hr', expected: ['challenge', 'approach', 'solution', 'result', 'team'] },
    { q: 'What are your biggest strengths and weaknesses?', topic: 'hr', expected: ['strength', 'weakness', 'improve', 'learning', 'honest'] },
  ],
  'system-design': [
    { q: 'How would you design a real-time chat application like WhatsApp?', topic: 'system-design', expected: ['websocket', 'message queue', 'database', 'scale', 'encryption'] },
    { q: 'Design a video streaming platform like YouTube.', topic: 'system-design', expected: ['cdn', 'transcoding', 'storage', 'stream', 'cache'] },
    { q: 'How would you design Twitter\'s trending topics feature?', topic: 'system-design', expected: ['redis', 'counter', 'aggregate', 'cache', 'time window'] },
    { q: 'Design an e-commerce cart and checkout system.', topic: 'system-design', expected: ['session', 'database', 'payment', 'inventory', 'race condition'] },
    { q: 'How would you architect a notification system for millions of users?', topic: 'system-design', expected: ['queue', 'push', 'fan out', 'retry', 'batch'] },
  ]
};

// ── Keyword-matching evaluator ─────────────────────────────────────────────
function scoreAnswer(answer, expectedKeywords) {
  const lowerAnswer = (answer || '').toLowerCase();
  const matched = expectedKeywords.filter(kw => lowerAnswer.includes(kw.toLowerCase()));
  const missed  = expectedKeywords.filter(kw => !lowerAnswer.includes(kw.toLowerCase()));
  const score   = expectedKeywords.length > 0 
    ? Math.max(2, Math.round((matched.length / expectedKeywords.length) * 10)) 
    : 5;

  let feedback;
  if (score >= 8)      feedback = '🔥 Excellent answer! Very strong understanding demonstrated.';
  else if (score >= 6) feedback = '✅ Good answer! You could expand on a couple more concepts.';
  else if (score >= 4) feedback = '⚠️ Partial answer. You missed some key concepts.';
  else                 feedback = '❌ Needs more depth. Study the fundamentals for this topic.';

  return { score, feedback, matched, missed };
}

// ──────────────────────────────────────────────────────────────────────────
// POST /student/interview/start
// Returns the first question instantly — NO LLM call
// ──────────────────────────────────────────────────────────────────────────
export const startInterview = asyncHandler(async (req, res, next) => {
  const interviewType = (req.body.type || 'technical').toLowerCase().replace(' ', '-');
  const pool = QUESTION_BANK[interviewType] || QUESTION_BANK.technical;

  // Shuffle and pick 5 questions for the session
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const sessionQuestions = shuffled.slice(0, Math.min(5, shuffled.length));

  // Store session in-process (for hackathon).
  // In production this would go into Redis with a sessionId key.
  const sessionId = `arena-${Date.now()}-${req.user._id}`;

  // Store the session questions on the response and client manages state
  res.status(200).json({
    success: true,
    data: {
      sessionId,
      interviewType,
      totalQuestions: sessionQuestions.length,
      questions: sessionQuestions.map((q, i) => ({
        index: i,
        question: q.q,
        topic: q.topic,
        expectedKeywords: q.expected
      }))
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// POST /student/interview/evaluate
// Evaluates a single answer deterministically — NO LLM call
// ──────────────────────────────────────────────────────────────────────────
export const evaluateAnswer = asyncHandler(async (req, res, next) => {
  const { answer, expectedKeywords } = req.body;
  if (!answer) return res.status(400).json({ success: false, message: 'answer is required' });

  // ⭐ FIX: Call scoreAnswer (internal helper), not evaluateAnswer (self)
  const result = scoreAnswer(answer, expectedKeywords || []);
  res.status(200).json({ success: true, data: result });
});

// ──────────────────────────────────────────────────────────────────────────
// POST /student/interview/complete
// Saves the final session summary to MongoDB
// ──────────────────────────────────────────────────────────────────────────
export const completeInterview = asyncHandler(async (req, res, next) => {
  const { interviewType, answeredQuestions } = req.body;
  // answeredQuestions: [{question, topic, studentAnswer, score, feedback}]
  if (!answeredQuestions || !Array.isArray(answeredQuestions)) {
    return res.status(400).json({ success: false, message: 'answeredQuestions array is required' });
  }

  const overallScore = answeredQuestions.length > 0
    ? Math.round(answeredQuestions.reduce((acc, q) => acc + (q.score || 0), 0) / answeredQuestions.length)
    : 0;

  const scoreLabel = overallScore >= 8 ? 'Excellent' : overallScore >= 6 ? 'Good' : overallScore >= 4 ? 'Average' : 'Needs Improvement';

  const strengths   = answeredQuestions.filter(q => q.score >= 7).map(q => q.topic);
  const weaknesses  = answeredQuestions.filter(q => q.score < 5).map(q => q.topic);

  const interview = await MockInterview.create({
    userId: req.user._id,
    type: interviewType || 'technical',
    questions: answeredQuestions.map(q => ({
      question: q.question,
      topic: q.topic,
      difficulty: 'medium',
      studentAnswer: q.studentAnswer,
      score: q.score,
      feedback: q.feedback
    })),
    overallScore,
    strengths: [...new Set(strengths)],
    weaknesses: [...new Set(weaknesses)],
    recommendation: `Score: ${overallScore}/10 (${scoreLabel}). ${weaknesses.length > 0 ? `Focus on: ${[...new Set(weaknesses)].join(', ')}` : 'Great performance across all topics!'}`
  });

  res.status(201).json({
    success: true,
    data: {
      overallScore,
      recommendation: interview.recommendation,
      strengths: interview.strengths,
      weaknesses: interview.weaknesses,
      interviewId: interview._id
    }
  });
});

// Keep legacy endpoints for backwards compatibility
export const submitAnswer  = async (req, res) => res.status(410).json({ success: false, message: 'Use /interview/evaluate instead' });
export const getInterviews = async (req, res, next) => {
  try {
    const interviews = await MockInterview.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ success: true, data: interviews });
  } catch (err) { next(err); }
};
