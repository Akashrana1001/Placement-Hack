import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Ollama is optional — only needed for local dev (Groq is used in production)
  OLLAMA_BASE_URL: z.string().url().optional().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().optional().default('llama3'),
  OLLAMA_EMBED_MODEL: z.string().optional().default('nomic-embed-text'),
  // Groq Cloud — used in production on Render
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional().default('llama-3.1-8b-instant'),
  CORS_ORIGIN: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;