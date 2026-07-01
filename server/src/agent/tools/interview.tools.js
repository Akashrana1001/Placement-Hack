/**
 * interview.tools.js
 * Curated question bank + deterministic scoring.
 * NO LLM calls — all questions are pre-written for speed and reliability.
 */

const QUESTION_BANK = [
  // DSA
  { question: 'How does a HashMap handle collisions?', topic: 'dsa', difficulty: 'medium', expectedTopics: ['chaining', 'linked list', 'open addressing', 'load factor'] },
  { question: 'Explain the difference between BFS and DFS.', topic: 'dsa', difficulty: 'easy', expectedTopics: ['queue', 'stack', 'breadth', 'depth', 'traversal'] },
  { question: 'What is the time complexity of mergesort and why?', topic: 'dsa', difficulty: 'medium', expectedTopics: ['n log n', 'divide', 'merge', 'recursive'] },
  { question: 'How would you detect a cycle in a linked list?', topic: 'dsa', difficulty: 'medium', expectedTopics: ['floyd', 'slow', 'fast', 'pointer', 'tortoise'] },
  { question: 'What is dynamic programming? Give a real-world example.', topic: 'dsa', difficulty: 'hard', expectedTopics: ['subproblem', 'memoization', 'optimal', 'overlapping'] },
  // Java
  { question: 'Explain the difference between an Interface and an Abstract Class in Java.', topic: 'java', difficulty: 'medium', expectedTopics: ['multiple inheritance', 'default methods', 'abstract', 'implement'] },
  { question: 'What is the Java Memory Model? Explain Stack vs Heap.', topic: 'java', difficulty: 'hard', expectedTopics: ['stack', 'heap', 'garbage', 'thread', 'reference'] },
  { question: 'What are the four pillars of OOP?', topic: 'java', difficulty: 'easy', expectedTopics: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'] },
  { question: 'Explain multithreading in Java. What is a race condition?', topic: 'java', difficulty: 'hard', expectedTopics: ['thread', 'synchronized', 'race', 'lock', 'concurrent'] },
  // Python
  { question: 'What is the difference between a list and a tuple in Python?', topic: 'python', difficulty: 'easy', expectedTopics: ['mutable', 'immutable', 'performance', 'index'] },
  { question: 'Explain decorators in Python with an example.', topic: 'python', difficulty: 'medium', expectedTopics: ['wrapper', 'function', '@', 'closure', 'higher-order'] },
  { question: 'How does garbage collection work in Python?', topic: 'python', difficulty: 'hard', expectedTopics: ['reference counting', 'gc module', 'cycle', 'generation'] },
  // Web Dev
  { question: 'Explain the event loop in Node.js.', topic: 'webdev', difficulty: 'medium', expectedTopics: ['callback', 'queue', 'non-blocking', 'async', 'single thread'] },
  { question: 'What is the Virtual DOM in React and why is it useful?', topic: 'webdev', difficulty: 'medium', expectedTopics: ['diff', 'reconciliation', 'performance', 'real dom', 'render'] },
  { question: 'Explain REST API principles.', topic: 'webdev', difficulty: 'easy', expectedTopics: ['stateless', 'http methods', 'resource', 'endpoint', 'json'] },
  { question: 'What is the difference between SQL and NoSQL databases?', topic: 'sql', difficulty: 'easy', expectedTopics: ['schema', 'relational', 'document', 'scale', 'flexible'] },
  // System Design
  { question: 'How would you design a URL shortener like bit.ly?', topic: 'system-design', difficulty: 'hard', expectedTopics: ['hash', 'database', 'redirect', 'cache', 'collision'] },
  { question: 'What is load balancing? Name different strategies.', topic: 'system-design', difficulty: 'medium', expectedTopics: ['round robin', 'least connections', 'distribute', 'health check'] },
  // HR
  { question: 'Tell me about a time you handled a conflict in a team.', topic: 'hr', difficulty: 'easy', expectedTopics: ['situation', 'action', 'result', 'resolved', 'communication'] },
  { question: 'Where do you see yourself in 5 years?', topic: 'hr', difficulty: 'easy', expectedTopics: ['growth', 'learning', 'technology', 'leadership', 'contribute'] },
  { question: 'Why should we hire you over other candidates?', topic: 'hr', difficulty: 'medium', expectedTopics: ['skill', 'passionate', 'value', 'team', 'unique'] },
  // General
  { question: 'Explain a challenging technical problem you solved recently.', topic: 'general', difficulty: 'medium', expectedTopics: ['problem', 'approach', 'solution', 'result', 'learned'] },
];

export const registerInterviewTools = (registry) => {
  registry.registerTool(
    'generateQuestion',
    'Gets an interview question for a topic. Input: {"topic": "dsa", "difficulty": "medium"}',
    async (params) => {
      const topic = (params?.topic || 'general').toLowerCase();
      const difficulty = (params?.difficulty || 'medium').toLowerCase();

      // Filter by topic first, then difficulty
      let candidates = QUESTION_BANK.filter((q) => q.topic === topic);
      if (candidates.length === 0) {
        candidates = QUESTION_BANK.filter((q) => q.topic.includes(topic) || topic.includes(q.topic));
      }
      if (candidates.length === 0) {
        candidates = QUESTION_BANK; // Fallback to any
      }

      // Try to match difficulty
      const withDifficulty = candidates.filter((q) => q.difficulty === difficulty);
      const pool = withDifficulty.length > 0 ? withDifficulty : candidates;

      // Pick a random question from the pool
      const picked = pool[Math.floor(Math.random() * pool.length)];
      return {
        question: picked.question,
        topic: picked.topic,
        difficulty: picked.difficulty,
        expectedTopics: picked.expectedTopics,
      };
    }
  );

  registry.registerTool(
    'evaluateAnswer',
    'Scores a student answer against expected topics. Input: {"answer": "student text", "expectedTopics": ["topic1", "topic2"]}',
    async (params) => {
      const answer = (params?.answer || '').toLowerCase();
      const expected = params?.expectedTopics || [];

      let matches = 0;
      const missed = [];
      const matched = [];

      expected.forEach((topic) => {
        if (answer.includes(topic.toLowerCase())) {
          matches++;
          matched.push(topic);
        } else {
          missed.push(topic);
        }
      });

      const score = expected.length > 0 ? Math.round((matches / expected.length) * 10) : 5;

      let feedback;
      if (score >= 8) feedback = 'Excellent answer! You demonstrated strong understanding.';
      else if (score >= 6) feedback = 'Good answer, but you could expand on a few more points.';
      else if (score >= 4) feedback = 'Partial answer. You missed several key concepts.';
      else feedback = 'Weak answer. Review the fundamentals for this topic.';

      return { score, feedback, matchedPoints: matched, missedPoints: missed };
    }
  );
};