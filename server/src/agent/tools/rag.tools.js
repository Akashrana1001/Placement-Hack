/**
 * rag.tools.js
 * queryVectorStore — retrieves grounded context from FAISS before the recon
 * agent makes any LLM calls, grounding the analysis in actual resume content
 * rather than relying solely on the LLM's in-context memory.
 */
import { ragService } from '../../services/rag.service.js';

export const registerRagTools = (registry) => {
  registry.registerTool(
    'queryVectorStore',
    'Retrieves grounded context chunks from FAISS for this student\'s resume. CALL THIS FIRST. Input: {"query": "technical skills experience education projects"}',
    async (params, context) => {
      const query =
        typeof params?.query === 'string' && params.query.trim()
          ? params.query.trim()
          : 'technical skills experience education projects';

      const userId = context?.userId;
      if (!userId) {
        return {
          success: true,
          context: [],
          summary: 'No userId in context — skipping RAG retrieval.',
        };
      }

      const chunks = await ragService.queryContext(userId, query, 'resume', 3);

      return {
        success: true,
        context: chunks,
        summary:
          chunks.length > 0
            ? `Retrieved ${chunks.length} grounded chunk(s). Use these as the primary source of truth for the resume analysis.`
            : 'No indexed content found — RAG service may be starting up. Proceed with raw resume text.',
      };
    }
  );
};
