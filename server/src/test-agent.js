/**
 * test-agent.js
 * Quick smoke-test for Phase 3: Ollama + Redis + MongoDB + ReAct Loop.
 * Run from the server/ directory:  node src/test-agent.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { parseAgentResponse } from './agent/parser.js';

// ── Config (adjust to match your .env) ───────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agent_db';
const REDIS_URL   = process.env.REDIS_URL   || 'redis://localhost:6379';
const OLLAMA_URL  = process.env.OLLAMA_URL  || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
// ── Dummy tools ───────────────────────────────────────────────────────────────
const TOOLS = {
  get_weather: ({ city }) => ({
    city,
    temperature: '24°C',
    condition: 'Sunny',
  }),
};

// ── Trace model (minimal) ─────────────────────────────────────────────────────
const traceSchema = new mongoose.Schema(
  { sessionId: String, steps: Array, finalAnswer: String },
  { timestamps: true }
);
const Trace = mongoose.model('Trace', traceSchema);

// ── Ollama call ───────────────────────────────────────────────────────────────
async function callOllama(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.response;
}

// ── ReAct loop ────────────────────────────────────────────────────────────────
async function runAgent(userQuery) {
  const sessionId = `test-${Date.now()}`;
  const steps = [];
  const MAX_TURNS = 6;

  const systemPrompt = `You are a helpful AI assistant. Use the ReAct format strictly:

THOUGHT: <your reasoning>
ACTION: <tool_name>
ACTION_INPUT: <JSON object>

Or, when you have the answer:

THOUGHT: <your reasoning>
FINAL_ANSWER: <your answer>

Available tools:
- get_weather: Gets weather for a city. Input: {"city": "<city name>"}

Begin!`;

  let prompt = `${systemPrompt}\n\nUser: ${userQuery}\n`;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    console.log(`\n--- Turn ${turn + 1} ---`);
    console.log('Calling Ollama...');

    const llmOutput = await callOllama(prompt);
    console.log('LLM output:\n', llmOutput);

    const parsed = parseAgentResponse(llmOutput);
    console.log('Parsed:', JSON.stringify(parsed, null, 2));

    steps.push({ turn, llmOutput, parsed });

    if (parsed.isDone) {
      console.log('\n✅ Final Answer:', parsed.finalAnswer);
      await Trace.create({ sessionId, steps, finalAnswer: parsed.finalAnswer });
      console.log('📝 Trace saved to MongoDB.');
      return parsed.finalAnswer;
    }

    if (!parsed.action) {
      console.warn('⚠️  No action found and not done. Stopping.');
      break;
    }

    // Execute tool
    const toolFn = TOOLS[parsed.action];
    if (!toolFn) {
      console.error(`❌ Unknown tool: "${parsed.action}"`);
      break;
    }

    const toolResult = toolFn(parsed.actionInput || {});
    console.log('🔧 Tool result:', toolResult);

    // Append observation and loop
    prompt += `${llmOutput}\nOBSERVATION: ${JSON.stringify(toolResult)}\n`;
  }

  console.error('❌ Max turns reached without a final answer.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected.');

  console.log('Connecting to Redis...');
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();
  console.log('✅ Redis connected.');

  try {
    await runAgent('What is the weather like in Bangalore?');
  } finally {
    await mongoose.disconnect();
    await redis.disconnect();
    console.log('\nConnections closed.');
  }
})();