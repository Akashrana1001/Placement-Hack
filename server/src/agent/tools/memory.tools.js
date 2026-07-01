/**
 * memory.tools.js
 * Tools for reading and writing short-term session context.
 */
import { getSessionContext, appendToContext } from '../memory/shortTerm.js';

export const registerMemoryTools = (registry) => {
  registry.registerTool(
    'readMemory',
    'Reads conversation context for a session. Input: {"sessionId": "uuid"}',
    async (params) => {
      const context = await getSessionContext(params?.sessionId || '');
      return context.length > 0 ? context : { message: 'No previous context found for this session.' };
    }
  );

  registry.registerTool(
    'writeMemory',
    'Writes a key-value pair to session memory. Input: {"sessionId": "uuid", "key": "weakAreas", "value": ["DSA", "Java"]}',
    async (params) => {
      const { sessionId, key, value } = params || {};
      if (!sessionId || !key) return { error: 'sessionId and key are required.' };
      await appendToContext(sessionId, { role: 'memory', content: JSON.stringify({ [key]: value }) });
      return { written: true, key };
    }
  );
};