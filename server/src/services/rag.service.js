/**
 * rag.service.js
 * HTTP client for the Python FAISS RAG microservice (rag/main.py).
 * All errors are non-fatal — the agent degrades gracefully when the
 * service is unavailable (e.g. first run before Python deps are installed).
 */
import axios from 'axios';
import { logger } from '../utils/logger.js';

const RAG_BASE = process.env.RAG_SERVICE_URL || 'http://localhost:8001';

const client = axios.create({ baseURL: RAG_BASE, timeout: 30_000 });

export const ragService = {
  /**
   * Chunk and embed a document into the user's FAISS index.
   * Called on resume upload — fire-and-forget, never blocks the HTTP response.
   */
  async embedDocument(userId, text, docType = 'resume') {
    try {
      const { data } = await client.post('/embed', {
        user_id: String(userId),
        text,
        doc_type: docType,
      });
      logger.info(`📚 RAG: indexed ${data.chunks_indexed} chunks for user ${userId}`);
      return data;
    } catch (err) {
      logger.warn(`⚠️  RAG embed skipped (service unavailable): ${err.message}`);
      return null;
    }
  },

  /**
   * Retrieve the top-k most relevant chunks for a query.
   * Called by the queryVectorStore tool inside the recon agent.
   */
  async queryContext(userId, query, docType = 'resume', topK = 3) {
    try {
      const { data } = await client.post('/query', {
        user_id: String(userId),
        query,
        doc_type: docType,
        top_k: topK,
      });
      return Array.isArray(data.context) ? data.context : [];
    } catch (err) {
      logger.warn(`⚠️  RAG query skipped (service unavailable): ${err.message}`);
      return [];
    }
  },
};
