/**
 * registry.js
 * Tool Registry — maps tool names to async handler functions.
 * Each agent job gets a FRESH registry instance so tools don't bleed between jobs.
 */
import { logger } from '../../utils/logger.js';

export class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  /**
   * Register a tool with a name, description, and async handler.
   * @param {string} name - Unique tool name (e.g. "parseResume")
   * @param {string} description - Short description injected into the LLM system prompt
   * @param {function} handler - Async function(params) → result
   */
  registerTool(name, description, handler) {
    if (this._tools.has(name)) {
      logger.warn(`⚠️ Tool "${name}" already registered — overwriting.`);
    }
    this._tools.set(name, { name, description, handler });
    logger.info(`🔧 Tool registered: ${name}`);
  }

  /**
   * Get a tool by name.
   * @returns {{ name, description, handler } | null}
   */
  getTool(name) {
    return this._tools.get(name) || null;
  }

  /**
   * Get all registered tools.
   * @returns {Array<{ name, description }>}
   */
  getAllTools() {
    return Array.from(this._tools.values()).map(({ name, description }) => ({
      name,
      description,
    }));
  }

  /**
   * Build a formatted string of all tool descriptions for injection into LLM system prompts.
   * @returns {string}
   */
  getToolDescriptions() {
    if (this._tools.size === 0) return 'No tools available.';

    const lines = Array.from(this._tools.values()).map(
      (t) => `- ${t.name}: ${t.description}`
    );
    return `Available tools:\n${lines.join('\n')}`;
  }

  /**
   * Execute a tool by name with the given params.
   * Always returns { success, result } or { success, error } — never throws.
   */
  async executeTool(name, params, context = {}) {
    const tool = this._tools.get(name);
    const startTime = Date.now();

    if (!tool) {
      logger.error(`❌ Tool not found: "${name}"`);
      return { success: false, error: `Tool not found: "${name}". Available tools: ${Array.from(this._tools.keys()).join(', ')}` };
    }

    try {
      const result = await tool.handler(params, context);
      const latency = Date.now() - startTime;
      logger.info(`✅ Tool "${name}" executed in ${latency}ms`);
      return { success: true, result };
    } catch (err) {
      const latency = Date.now() - startTime;
      logger.error(`❌ Tool "${name}" failed after ${latency}ms: ${err.message}`);
      return { success: false, error: `Tool execution failed: ${err.message}` };
    }
  }
}

// ── Convenience factory ──────────────────────────────────────────────────────
// Each agent job should call createToolRegistry() to get a fresh instance.
export const createToolRegistry = () => new ToolRegistry();
