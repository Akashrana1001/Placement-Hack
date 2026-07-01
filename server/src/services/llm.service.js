import { Ollama } from 'ollama';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { cacheGet, cacheSet, incrementStat } from './cache.service.js';

// Explicitly initialize Ollama with the base URL
const ollama = new Ollama({ host: env.OLLAMA_BASE_URL });

export const generateCompletion = async (prompt, options = {}) => {
  const { 
    model = env.OLLAMA_MODEL, 
    temperature = 0.7, 
    systemPrompt = '' 
  } = options;

  // 1. Hash the prompt for Redis caching
  const hashInput = `${model}:${systemPrompt}:${prompt}`;
  const promptHash = crypto.createHash('md5').update(hashInput).digest('hex');
  const cacheKey = `llm:${promptHash}`;

  // 2. Check Cache
  const cachedResponse = await cacheGet(cacheKey);
  if (cachedResponse) {
    await incrementStat('stats:cache:hits');
    logger.info(`⚡ LLM Cache HIT | Model: ${model}`);
    return { response: cachedResponse, cached: true, latency: 0 };
  }

  // 3. Call Ollama on Cache Miss
  await incrementStat('stats:cache:misses');
  logger.info(`🧠 LLM Cache MISS | Generating via ${model}...`);
  const startTime = Date.now();

  try {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const result = await ollama.chat({
      model,
      messages,
      options: { temperature }
    });

    const latency = Date.now() - startTime;
    logger.info(`✅ LLM Generation Complete | Latency: ${latency}ms`);

    // Cache the result for 1 hour
    await cacheSet(cacheKey, result.message.content, 3600);

    return { response: result.message.content, cached: false, latency };
  } catch (error) {
    logger.error(`❌ Ollama Error: ${error.message}`);
    throw new Error(`LLM Generation Failed: ${error.message}`);
  }
};

export const generateEmbedding = async (text) => {
  try {
    const response = await ollama.embeddings({
      model: env.OLLAMA_EMBED_MODEL,
      prompt: text
    });
    return response.embedding;
  } catch (error) {
    logger.error(`❌ Embedding Error: ${error.message}`);
    throw new Error('Failed to generate embedding');
  }
};