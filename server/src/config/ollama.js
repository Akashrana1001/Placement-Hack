/**
 * ollama.js
 * Configures the connection to the local Ollama instance.
 */
import axios from 'axios';
import { logger } from '../utils/logger.js';

export const ollama = {
  /**
   * generate
   * Sends a prompt to the local Ollama API.
   * @param {string} agentType - Used to customize the system behavior.
   * @param {string} prompt - The ReAct prompt to process.
   */
  generate: async (agentType, prompt) => {
    try {
      // Default to standard Ollama port 11434 if env is not set
      const url = process.env.OLLAMA_URL || 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

      const response = await axios.post(`${url}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,   // Lower = more deterministic = faster convergence
          num_predict: 400,   // Was 1024 — cuts generation time ~60%
          stop: ['Observation:', 'Human:', 'User:', '\n\n\n'] // Stop immediately after each step
        }
      });

      if (!response.data || !response.data.response) {
        throw new Error("Empty response from Ollama");
      }

      return response.data.response;
    } catch (error) {
      logger.error(`Ollama Generation Error: ${error.message}`);
      
      // If Ollama is actually down, give a clear instruction in the logs
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Ollama service unreachable at ${process.env.OLLAMA_URL || 'http://localhost:11434'}. Please run 'ollama serve' and ensure the model is pulled.`);
      }
      
      throw error;
    }
  }
};