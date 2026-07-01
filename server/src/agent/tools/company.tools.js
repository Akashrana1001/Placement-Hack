import { Company } from '../../models/Company.js';

export const registerCompanyTools = (registry) => {
  registry.registerTool('matchCompanyReqs', 'Matches skills against companies. Input: {"skills": ["java", "react"]}', async (params) => {
    
    // 🛡️ ANTIGRAVITY SHIELD: Extreme Defensive Programming
    // Rule 1: NEVER trust params
    const safeParams = params || {};
    
    // 🛡️ SUPER FORGIVING SKILL EXTRACTION (Fixes Local LLM JSON issues)
    let extractedSkills = [];
    
    try {
      // If LLM passed standard format: {"skills": ["java", "react"]}
      if (Array.isArray(safeParams.skills) && safeParams.skills.length > 0) {
        extractedSkills = safeParams.skills;
      } 
      // If LLM nested it: {"skills": {"technical": ["java"]}}
      else if (safeParams.skills && typeof safeParams.skills === 'object') {
        extractedSkills = Object.values(safeParams.skills).flat();
      } 
      // If LLM dumped the whole previous observation object
      else if (typeof safeParams === 'object' && Object.keys(safeParams).length > 0) {
        extractedSkills = Object.values(safeParams).flat();
      }
    } catch (e) {
      extractedSkills = [];
    }

    let userSkills = extractedSkills
      .flat(Infinity)
      .filter(s => typeof s === 'string')
      .map(s => s.toLowerCase());

    // Rule 2: NEVER assume an array has valid items
    if (userSkills.length === 0) {
      userSkills = ['basic programming'];
    }

    let matches = [];
    try {
      const companies = await Company.find() || [];
      
      matches = companies.map(company => {
        const role = company.roles && company.roles[0] ? company.roles[0] : null;
        if (!role) return null;

        const required = Array.isArray(role.requiredSkills) ? role.requiredSkills.map(s => s.toLowerCase()) : [];
        const matched = required.filter(s => userSkills.includes(s));
        const missing = required.filter(s => !userSkills.includes(s));
        
        const score = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 0;
        
        return {
          companyName: company.name || "Unknown Company",
          tier: company.tier || "Standard",
          matchScore: score,
          matchedSkills: matched,
          missingSkills: missing
        };
      }).filter(Boolean);
    } catch (e) {
      // Graceful DB fallback
      matches = [];
    }

    const sortedMatches = matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

    // Rule 4: Always return success: true with summary
    return {
      success: true,
      summary: `Found ${sortedMatches.length} matching companies based on ${userSkills.length} skills.`,
      companyMatches: sortedMatches
    };
  });
};