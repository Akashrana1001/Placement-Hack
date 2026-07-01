/**
 * upload.middleware.js
 * Multer-based file upload handler for resumes.
 * Supports: PDF, DOCX, DOC, plain TXT
 * Extracts raw text in-memory — no disk writes needed.
 */
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';

// pdf-parse uses CommonJS — bridge it safely via createRequire
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// ── Keep files in memory — no /tmp clutter ──────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword',   // .doc
    'text/plain',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Upload PDF, DOCX, DOC, or TXT only.'), false);
  }
};

export const resumeUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ── Extract plain text from the uploaded buffer ─────────────────────────────
export async function extractTextFromFile(file) {
  const { mimetype, buffer } = file;

  try {
    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      return (data.text || '').trim();
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').trim();
    }

    if (mimetype === 'text/plain') {
      return buffer.toString('utf-8').trim();
    }

    throw new Error('Unsupported file type');
  } catch (err) {
    throw new Error(`Text extraction failed: ${err.message}`);
  }
}
