import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Resume } from '../src/models/Resume.js';
import { PrepPlan } from '../src/models/PrepPlan.js';
import { MockInterview } from '../src/models/MockInterview.js';
import { Alert } from '../src/models/Alert.js';
import { AgentTrace } from '../src/models/AgentTrace.js';

import companiesData from './companies.json' with { type: 'json' };
import studentsData from './students.json' with { type: 'json' };

const seedDatabase = async () => {
  try {
    logger.info('⏳ Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('✅ Connected.');

    // 1. Wipe Database Clean
    logger.info('🧹 Wiping existing data...');
    await User.deleteMany();
    await Company.deleteMany();
    await Resume.deleteMany();
    await PrepPlan.deleteMany();
    await MockInterview.deleteMany();
    await Alert.deleteMany();
    await AgentTrace.deleteMany();

    // 2. Insert Companies
    logger.info('🏢 Seeding Companies...');
    await Company.insertMany(companiesData);

    // 3. Create TPC Admin
    logger.info('👨‍💼 Creating TPC Admin...');
    await User.create({
      name: "Dr. Admin",
      email: "admin@tpc.edu",
      password: "password123", // Will be hashed by pre-save hook
      role: "tpc"
    });

    // 4. Create Students & Resumes
    logger.info('🎓 Seeding Students & Resumes...');
    for (const student of studentsData) {
      // We use User.create() so the pre('save') hook hashes the password!
      const user = await User.create({
        name: student.name,
        email: student.email,
        password: "password123",
        role: "student",
        department: student.department,
        year: student.year,
        skills: student.skills,
        riskScore: student.riskScore
      });

      // Create a dummy resume entry for them
      await Resume.create({
        userId: user._id,
        rawText: student.resumeText,
        // We leave parsedData empty for now so the Recon Agent has something to do!
      });
    }

    logger.info('🎉 Seeding Complete!');
    logger.info(`✅ Seeded ${companiesData.length} Companies.`);
    logger.info(`✅ Seeded ${studentsData.length} Students.`);
    logger.info(`✅ Seeded 1 TPC Admin.`);
    
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Error Seeding Data: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();