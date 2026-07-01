/**
 * shortTerm.js
 * Redis-backed short-term session memory.
 * Stores the current conversation context for fast reads mid-agent-loop.
 * TTL: 30 minutes by default (sessions expire automatically).
 */
import { redis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

const PREFIX = 'session:';

/**
 * Get the full session context for a given sessionId.
 * @param {string} sessionId
 * @returns {Array<{ role, content, timestamp }>} — context array, or empty array if none
 */
export const getSessionContext = async (sessionId) => {
  try {
    const raw = await redis.get(`${PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    logger.error(`ShortTerm.get error [${sessionId}]: ${err.message}`);
    return [];
  }
};

/**
 * Overwrite the entire session context.
 * @param {string} sessionId
 * @param {Array} contextArray
 * @param {number} ttlSeconds — default 30 minutes
 */
export const setSessionContext = async (sessionId, contextArray, ttlSeconds = 1800) => {
  try {
    await redis.set(
      `${PREFIX}${sessionId}`,
      JSON.stringify(contextArray),
      'EX',
      ttlSeconds
    );
  } catch (err) {
    logger.error(`ShortTerm.set error [${sessionId}]: ${err.message}`);
  }
};

/**
 * Append a single entry to the existing session context.
 * @param {string} sessionId
 * @param {{ role: string, content: string }} entry
 */
export const appendToContext = async (sessionId, entry) => {
  try {
    const current = await getSessionContext(sessionId);
    current.push({ ...entry, timestamp: new Date().toISOString() });

    // Keep context from growing unbounded — last 20 entries
    const trimmed = current.slice(-20);
    await setSessionContext(sessionId, trimmed);
  } catch (err) {
    logger.error(`ShortTerm.append error [${sessionId}]: ${err.message}`);
  }
};

/**
 * Delete session context.
 */
export const clearSession = async (sessionId) => {
  try {
    await redis.del(`${PREFIX}${sessionId}`);
  } catch (err) {
    logger.error(`ShortTerm.clear error [${sessionId}]: ${err.message}`);
  }
};
