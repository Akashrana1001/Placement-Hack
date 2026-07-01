/**
 * parser.js
 * Robust ReAct response parser for local LLMs (Ollama, etc.)
 * Handles inconsistent formatting, markdown hallucinations, and edge cases.
 */

export const parseAgentResponse = (llmOutput) => {
  const result = {
    thought: 'Processing...',
    action: null,
    actionInput: null,
    finalAnswer: null,
    isDone: false,
  };

  if (!llmOutput || typeof llmOutput !== 'string') {
    result.isDone = true;
    result.finalAnswer = 'Error: Invalid LLM output.';
    return result;
  }

  // Normalize: collapse excessive blank lines, trim
  const normalized = llmOutput.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // ── 1. Extract THOUGHT ────────────────────────────────────────────────────
  // Stops at ACTION:, ACTION_INPUT:, or FINAL_ANSWER: (case-insensitive)
  const thoughtMatch = normalized.match(
    /THOUGHT:\s*([\s\S]*?)(?=\n(?:ACTION|ACTION_INPUT|FINAL_ANSWER)\s*:|$)/i
  );
  if (thoughtMatch && thoughtMatch[1].trim()) {
    result.thought = thoughtMatch[1].trim();
  }

  // ── 2. Check for FINAL_ANSWER (takes priority — exit early) ──────────────
  // Handles multiline answers and optional markdown fences
  const finalAnswerMatch = normalized.match(/FINAL_ANSWER:\s*([\s\S]*)$/i);
  if (finalAnswerMatch) {
    result.finalAnswer = cleanValue(finalAnswerMatch[1]);
    result.isDone = true;
    return result;
  }

  // ── 3. Extract ACTION ─────────────────────────────────────────────────────
  // Accepts "ACTION:" or "Action:" with optional surrounding whitespace
  const actionMatch = normalized.match(/ACTION:\s*(.+?)(?:\n|$)/i);
  if (actionMatch) {
    // Strip accidental punctuation local LLMs sometimes append (e.g. "get_weather.")
    result.action = actionMatch[1].trim().replace(/[.,;:!?]+$/, '');
  }

  // ── 4. Extract ACTION_INPUT ───────────────────────────────────────────────
  // Stops before the next THOUGHT: or ACTION: block (for multi-turn outputs)
  const inputMatch = normalized.match(
    /ACTION_INPUT:\s*([\s\S]*?)(?=\nTHOUGHT:|\nACTION:|\nFINAL_ANSWER:|$)/i
  );
  if (inputMatch) {
    const rawInput = cleanValue(inputMatch[1]);
    result.actionInput = parseActionInput(rawInput);
  }

  return result;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences (```json … ``` or ``` … ```) and trims.
 * Local LLMs frequently hallucinate these even when not asked.
 */
const cleanValue = (raw) => {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^```(?:json|javascript|js|text|plain)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
};

/**
 * Attempts to parse ACTION_INPUT as JSON.
 * Falls back to the raw string so the orchestrator can decide what to do.
 */
const parseActionInput = (raw) => {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    // Not valid JSON — try to salvage a single-key object the LLM may have
    // emitted without braces, e.g.  "city": "Bangalore"
    const kvMatch = raw.match(/^"?(\w+)"?\s*:\s*"?([^"]+)"?$/);
    if (kvMatch) {
      return { [kvMatch[1]]: kvMatch[2].trim() };
    }
    // Give up and return the raw string — the tool handler can deal with it
    return raw;
  }
};