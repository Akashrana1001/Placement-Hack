import axios from 'axios';
import { logger } from './utils/logger.js';

const TOTAL_JOBS = 5
const API_URL = 'http://localhost:5000/api/auth/login';
const TEST_JOB_URL = 'http://localhost:5000/api/student/resume'; // Use the real API route

const runStressTest = async () => {
    try {
        logger.info(`🔥 INITIALIZING STRESS TEST: ${TOTAL_JOBS} CONCURRENT JOBS`);

        // 1. Get a token
        const loginRes = await axios.post(API_URL, {
            email: 'priya@test.com',
            password: 'password123'
        });
        const token = loginRes.data.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Flood the queue
        const startTime = Date.now();
        const requests = Array.from({ length: TOTAL_JOBS }).map((_, i) => {
            return axios.post(TEST_JOB_URL, {
                resumeText: `Student #${i} with skills in React and Node.js. This resume text is long enough to pass the 50 char validation rule added in code review.`
            }, { headers })
                .then(res => res)
                .catch(e => {
                    console.error("JOB FAILED:", {
                        message: e.message,
                        status: e.response?.status,
                        data: e.response?.data
                    });
                    return null;
                });
        });

        const results = await Promise.all(requests);
        const successCount = results.filter(r => r && r.data?.success).length;
        logger.info(`✅ DISPATCH COMPLETE: ${successCount}/${TOTAL_JOBS} jobs queued.`);
        logger.info(`⏱️ Dispatch Latency: ${Date.now() - startTime}ms`);
        logger.info(`📈 Monitor Bull Board: http://localhost:5000/admin/queues`);

    } catch (err) {
        logger.error({
            message: err.message,
            status: err.response?.status,
            data: err.response?.data
        }, '❌ Stress Test Failed');
    }
};

runStressTest();