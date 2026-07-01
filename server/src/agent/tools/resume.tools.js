/**
 * resume.tools.js
 * Tools for parsing resumes and extracting skills.
 * Updated with "Antigravity" context-awareness to prevent LLM hallucinations.
 */

// Comprehensive skill bank for deterministic keyword matching
const KNOWN_SKILLS = [
  // Languages
  'java', 'python', 'c++', 'c#', 'c', 'javascript', 'typescript', 'go', 'rust', 'ruby', 'php', 'kotlin', 'swift',
  // Web Frontend
  'html', 'css', 'react', 'angular', 'vue', 'next.js', 'tailwindcss', 'bootstrap', 'sass',
  // Web Backend
  'node.js', 'express', 'spring boot', 'spring', 'django', 'flask', 'fastapi', '.net',
  // Databases
  'mongodb', 'sql', 'mysql', 'postgresql', 'redis', 'firebase', 'dynamodb', 'dbms',
  // DevOps / Cloud
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'linux', 'git', 'ci/cd', 'devops', 'cloud',
  // CS Fundamentals
  'dsa', 'data structures', 'algorithms', 'system design', 'oop', 'object-oriented', 'os', 'operating system',
  'networking', 'computer networks', 'software engineering', 'design patterns', 'microservices',
  // Data Science / ML
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn',
  'nlp', 'computer vision', 'data science', 'data analysis',
  // Testing / Other
  'testing', 'jest', 'selenium', 'agile', 'scrum', 'rest api', 'graphql', 'aptitude', 'postman'
];

// Skill Categorization mapping
const SKILL_CATEGORIES = {
  technical: ['java', 'python', 'c++', 'c#', 'c', 'javascript', 'typescript', 'go', 'dsa', 'data structures', 
    'algorithms', 'system design', 'oop', 'os', 'operating system', 'networking', 'dbms', 'aptitude', 'sql'],
  tools: ['react', 'angular', 'vue', 'node.js', 'express', 'spring boot', 'mongodb', 'mysql', 'postgresql', 
    'redis', 'aws', 'docker', 'kubernetes', 'git', 'postman', 'next.js', 'tailwindcss', 'html', 'css', 'linux'],
  soft: ['communication', 'teamwork', 'problem solving', 'leadership', 'agile', 'scrum'],
};

export const registerResumeTools = (registry) => {
  
  /**
   * TOOL: parseResume
   * Uses context-first logic to ensure the agent always analyzes the ACTUAL resume uploaded.
   */
  registry.registerTool(
    'parseResume',
    'Extracts education, skills, and experience from the resume. Input: {}',
    async (params, context) => {
      // 🛡️ ANTIGRAVITY SHIELD: Extreme Defensive Programming
      // Rule 1: NEVER trust params
      const safeParams = params || {};
      
      // ⭐ FIX: context.input is a JSON string like '{"resumeText":"..."}' from the controller.
      // Must parse it to extract the actual resume text, NOT search raw JSON syntax.
      let text = '';
      if (safeParams.resumeText) {
        // Direct param injection from orchestrator (highest priority)
        text = safeParams.resumeText;
      } else if (context?.input) {
        try {
          const inputObj = JSON.parse(context.input);
          text = inputObj.resumeText || context.input;
        } catch (e) {
          text = context.input; // Fallback: use raw string
        }
      }
      text = (text || '').toLowerCase();

      if (!text || text.length < 20) {
        // Rule 4: Graceful UI fallback
        return { 
          success: true,
          summary: 'Failed to extract from resume text. Default assumptions applied.',
          error: 'Resume text is missing or too short. Ensure input is passed correctly.',
          education: [{ degree: 'Degree not specified', gpa: 'N/A' }],
          skills: ['basic coding'],
          experience: 'Fresher',
          projectCount: 0
        };
      }

      // 1. Extract Skills via keyword matching
      const foundSkills = KNOWN_SKILLS.filter((skill) => text.includes(skill));

      // 2. Extract Education & CGPA via Regex
      const education = [];
      const cgpaMatch = text.match(/cgpa[:\s]*(\d+\.?\d*)/i) || text.match(/(\d+\.?\d*)\s*cgpa/i);
      
      if (/b\.tech|b\.e\.|bachelor|computer science/i.test(text)) {
        education.push({
          degree: 'B.Tech / B.E. in Computer Science',
          gpa: cgpaMatch ? cgpaMatch[1] : 'Not specified',
        });
      }

      // 3. Extract Experience Level
      const hasInternship = /intern(ship)?/i.test(text);
      const hasWorkExp = /work(ed|ing) at|employed|experience at|years of experience/i.test(text);
      const experience = hasInternship ? 'Internship Experience' : hasWorkExp ? 'Professional Experience' : 'Fresher';

      // 4. Project Detection
      const projectCount = (text.match(/project/gi) || []).length;

      return {
        success: true,
        education,
        skills: foundSkills.length > 0 ? foundSkills : ['basic coding'],
        experience,
        projectCount,
        summary: `Found ${foundSkills.length} skills and ${projectCount} project references.`
      };
    }
  );

  /**
   * TOOL: extractSkills
   * Groups found skills into meaningful UI categories.
   */
  registry.registerTool(
    'extractSkills',
    'Categorizes extracted skills. Input: {"skills": ["java", "react"]}',
    async (params) => {
      // 🛡️ ANTIGRAVITY SHIELD: Extreme Defensive Programming
      // Rule 1: NEVER trust params
      const safeParams = params || {};
      
      // Rule 2: NEVER assume an array exists
      let skills = Array.isArray(safeParams.skills) ? safeParams.skills : [];
      if (skills.length === 0) {
        skills = ['basic coding']; // Fallback
      }

      // Ensure all objects are effectively strings before manipulation
      skills = skills.filter(s => typeof s === 'string').map(s => s.toLowerCase());

      const categorized = {
        technical: skills.filter((s) => SKILL_CATEGORIES.technical.includes(s)),
        tools: skills.filter((s) => SKILL_CATEGORIES.tools.includes(s)),
        soft: skills.filter((s) => SKILL_CATEGORIES.soft.includes(s)),
      };

      // Fallback for soft skills if the student didn't list them
      if (categorized.soft.length === 0) {
        categorized.soft = ['communication', 'problem solving'];
      }

      // Rule 4: Always return success: true with summary
      return {
        success: true,
        summary: `Categorized ${skills.length} skills into technical, tools, and soft attributes.`,
        categorized
      };
    }
  );
};