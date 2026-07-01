/**
 * orchestrator.js ⭐ THE CORE ReAct LOOP
 *
 * Fixed: FINAL_ANSWER detection, tool result unwrapping, max-iteration fallback.
 */
import { ollama } from '../config/llm.js'; // auto-routes: Groq (prod) or Ollama (local)
import { logger } from '../utils/logger.js';
import { redis as pubsub } from '../config/redis.js';

export class ReActOrchestrator {
  constructor(config) {
    this.agentType = config.agentType;
    this.systemPrompt = config.systemPrompt;
    this.toolRegistry = config.toolRegistry;
    this.maxIterations = config.maxIterations || 5;
    this.jobId = config.jobId;
    this.userId = config.userId;
    this.memory = [];
  }

  /**
   * Run the ReAct loop.
   * @param {string} input — the user's query or data to process (JSON string from controller)
   * @returns {{ finalAnswer: string, steps: number }}
   */
  async run(input) {
    logger.info(`🚀 Agent [${this.agentType}] starting | job: ${this.jobId} | maxIter: ${this.maxIterations}`);

    for (let i = 0; i < this.maxIterations; i++) {
      const prompt = this.buildPrompt(input);

      // ── CALL THE LLM ──
      let response;
      try {
        response = await ollama.generate(this.agentType, prompt);
      } catch (err) {
        logger.error(`❌ LLM call failed on step ${i + 1}: ${err.message}`);
        const fallback = `Error: LLM generation failed - ${err.message}`;
        await this._publishStep({ stepNumber: i + 1, isDone: true, finalAnswer: fallback, thought: 'LLM error' });
        return { finalAnswer: fallback, steps: i + 1 };
      }

      // ── PARSE THE LLM OUTPUT ──
      const parsed = this.parseResponse(response);
      const stepNum = i + 1;

      logger.info(`📍 Step ${stepNum}/${this.maxIterations} | thought: "${(parsed.thought || '').substring(0, 80)}..." | action: ${parsed.action || 'NONE'} | final: ${!!parsed.finalAnswer}`);

      // ── CHECK FOR FINAL_ANSWER ──
      if (parsed.finalAnswer) {
        logger.info(`✅ Agent [${this.agentType}] completed in ${stepNum} steps`);
        await this._publishStep({ stepNumber: stepNum, thought: parsed.thought, isDone: true, finalAnswer: parsed.finalAnswer });
        return { finalAnswer: parsed.finalAnswer, steps: stepNum };
      }

      // ── NO ACTION AND NO FINAL_ANSWER = Confused LLM ──
      if (!parsed.action) {
        logger.warn(`⚠️ Agent [${this.agentType}] produced no action and no FINAL_ANSWER. Treating raw response as final.`);
        const fallback = parsed.thought || response;
        await this._publishStep({ stepNumber: stepNum, thought: parsed.thought, isDone: true, finalAnswer: fallback });
        return { finalAnswer: fallback, steps: stepNum };
      }

      // ── EXECUTE TOOL ──
      // Safely coerce actionInput to object (LLM sometimes passes strings or null)
      let safeParams = parsed.actionInput;
      if (typeof safeParams === 'string') {
        try { safeParams = JSON.parse(safeParams); } catch (e) { safeParams = {}; }
      } else if (!safeParams || typeof safeParams !== 'object') {
        safeParams = {};
      }

      // ⭐ INJECT USER INPUT for parseResume to prevent hallucination
      // The LLM cannot reliably pass large text blobs. Inject it out-of-band.
      if (parsed.action === 'parseResume') {
        try {
          const inputObj = JSON.parse(input);
          safeParams.resumeText = inputObj.resumeText || input;
        } catch (e) {
          safeParams.resumeText = input;
        }
      }

      const toolResult = await this.toolRegistry.executeTool(
        parsed.action,
        safeParams,
        { input, userId: this.userId }
      );

      // ⭐ FIX: Unwrap the registry's { success, result/error } envelope
      // The LLM must see the raw tool output, NOT the wrapper.
      let observation;
      if (toolResult.success) {
        observation = typeof toolResult.result === 'string'
          ? toolResult.result
          : JSON.stringify(toolResult.result);
      } else {
        observation = `Tool Error: ${toolResult.error}`;
      }

      // Store in memory for scratchpad
      this.memory.push({ thought: parsed.thought, action: parsed.action, actionInput: safeParams, observation });

      // Publish step to UI
      await this._publishStep({
        stepNumber: stepNum,
        thought: parsed.thought,
        action: parsed.action,
        actionInput: safeParams,
        observation: observation.length > 300 ? observation.substring(0, 300) + '...' : observation,
      });
    }

    // ── MAX ITERATIONS REACHED — must still return something ──
    logger.warn(`⚠️ Agent [${this.agentType}] hit max iterations (${this.maxIterations}). Forcing completion.`);
    const fallbackAnswer = this._getBestPartialResult();

    await this._publishStep({
      stepNumber: this.maxIterations + 1,
      thought: 'Max iterations reached — delivering partial results.',
      isDone: true,
      finalAnswer: fallbackAnswer,
    });

    return { finalAnswer: fallbackAnswer, steps: this.maxIterations };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROMPT BUILDER
  // ══════════════════════════════════════════════════════════════════════════

  buildPrompt(input) {
    const history = this.memory.map(m =>
      `Thought: ${m.thought}\nAction: ${m.action}\nAction Input: ${JSON.stringify(m.actionInput)}\nObservation: ${m.observation}`
    ).join('\n\n');

    return `${this.systemPrompt}\n\nUser Input: ${input}\n\n${history ? history + '\n\n' : ''}Thought:`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESPONSE PARSER — Fixed to detect FINAL_ANSWER
  // ══════════════════════════════════════════════════════════════════════════

  parseResponse(text) {
    if (!text || typeof text !== 'string') {
      return { thought: 'Error: Empty LLM response', action: null, actionInput: null, finalAnswer: null };
    }

    // ── Extract THOUGHT ──
    const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=\n(?:ACTION|ACTION_INPUT|FINAL_ANSWER|Action|Action Input)\s*:|$)/i);
    const thought = thoughtMatch ? thoughtMatch[1].trim() : 'Reasoning...';

    // ── Check for FINAL_ANSWER (takes priority — exit early) ──
    const finalAnswerMatch = text.match(/FINAL[_\s]ANSWER:\s*([\s\S]*)$/i);
    if (finalAnswerMatch) {
      let answer = finalAnswerMatch[1].trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      return { thought, action: null, actionInput: null, finalAnswer: answer };
    }

    // ── Check for raw JSON block (fallback if LLM forgot the FINAL_ANSWER prefix) ──
    const rawJsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (rawJsonMatch) {
      return { thought, action: null, actionInput: null, finalAnswer: rawJsonMatch[1].trim() };
    }

    // ── Extract ACTION ──
    const actionMatch = text.match(/Action:\s*(\w+)/i);
    const action = actionMatch ? actionMatch[1].trim().replace(/[.,;:!?]+$/, '') : null;

    // ── Check if it output just a JSON string at the end ──
    const trailingJson = text.match(/(\{[\s\S]*?\})\s*$/);
    if (!actionMatch && trailingJson) {
      return { thought, action: null, actionInput: null, finalAnswer: trailingJson[1].trim() };
    }

    // ── Extract ACTION_INPUT ──
    let actionInput = null;
    try {
      const inputMatch = text.match(/Action[\s_]Input:\s*(\{[\s\S]*?\})/i);
      if (inputMatch) actionInput = JSON.parse(inputMatch[1]);
    } catch (e) { actionInput = {}; }

    return { thought, action, actionInput, finalAnswer: null };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  async _publishStep(stepData) {
    try {
      await pubsub.publish(`agent:stream:${this.jobId}`, JSON.stringify({
        jobId: this.jobId,
        agentType: this.agentType,
        ...stepData,
      }));
    } catch (err) {
      // Pub/sub failure is non-fatal
      logger.warn(`⚠️ Failed to publish step to Redis: ${err.message}`);
    }
  }

  _getBestPartialResult() {
    if (this.memory.length === 0) return 'No analysis steps were completed.';

    // Return the last meaningful observation
    for (let i = this.memory.length - 1; i >= 0; i--) {
      if (this.memory[i].observation && this.memory[i].observation.length > 20) {
        return this.memory[i].observation;
      }
    }

    return this.memory[this.memory.length - 1]?.thought || 'Partial analysis completed.';
  }
}