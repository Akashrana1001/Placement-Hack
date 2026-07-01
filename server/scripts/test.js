import { evaluateAnswer } from '../src/controllers/interview.controller.js';

console.log('🧪 Starting API Integration Tests...');

const mockReq = { body: { expectedKeywords: ['test'] } }; // missing 'answer'
const mockRes = {
  statusCode: null,
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('Response Status:', this.statusCode);
    console.log('Response Data:', data);
    if (this.statusCode === 400 && data.success === false) {
      console.log('✅ Graceful error handling confirmed. Missing answer caught correctly.');
    } else {
      console.error('❌ Expected 400 error response with missing answer but got:', this.statusCode);
      process.exit(1);
    }
  }
};

const mockNext = (err) => {
  console.error('❌ next() was called with an error, should have been caught and handled:', err);
  process.exit(1);
};

try {
  evaluateAnswer(mockReq, mockRes, mockNext);
} catch (err) {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
}
