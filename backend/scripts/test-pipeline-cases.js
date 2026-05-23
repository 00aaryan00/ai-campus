require('dotenv').config();
const mongoose = require('mongoose');
const Result = require('../src/models/Result');
const STF = require('../src/models/analytics/AnalyticsStudentTestFact');
const SQF = require('../src/models/analytics/AnalyticsStudentQuestionFact');

const base = 'http://127.0.0.1:5000';

async function req(path, { method='GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  const uniq = Date.now();
  const password = 'Pass1234';

  const facultyReg = await req('/api/auth/register', { method: 'POST', body: { name:'Fac', email:`fac.case2.${uniq}@mail.com`, password, role:'faculty', department:'CSE' } });
  const studentReg = await req('/api/auth/register', { method: 'POST', body: { name:'Stu', email:`stu.case2.${uniq}@mail.com`, password, role:'student', department:'CSE' } });

  const facultyToken = facultyReg.data.token;
  const studentToken = studentReg.data.token;

  const create = await req('/api/tests/create', {
    method: 'POST',
    token: facultyToken,
    body: {
      title: `Case2 ${uniq}`,
      subject: 'Physics',
      mode: 'common',
      duration: 20,
      sets: {
        common: [
          { questionText: '1+1?', options: ['1','2'], correctAnswer: '2', topic: 'Math', difficultyLevel: 'easy' },
          { questionText: '3+1?', options: ['4','5'], correctAnswer: '4', topic: 'Math', difficultyLevel: 'easy' }
        ]
      }
    }
  });

  const testId = create.data?.test?._id;
  const roomCode = create.data?.test?.roomCode;
  const join = await req('/api/tests/join-by-code', { method: 'POST', token: studentToken, body: { roomCode } });
  const start = await req(`/api/tests/${testId}/start`, { method: 'POST', token: studentToken, body: { roomCode } });

  const questions = start.data?.test?.questions || [];
  const submit1 = await req('/api/results/submit', {
    method: 'POST',
    token: studentToken,
    body: {
      testId,
      answers: [
        { questionId: questions[0]?._id, selectedAnswer: '2' },
        { questionId: questions[1]?._id, selectedAnswer: '5' }
      ]
    }
  });

  const submit2 = await req('/api/results/submit', {
    method: 'POST',
    token: studentToken,
    body: {
      testId,
      answers: [
        { questionId: questions[0]?._id, selectedAnswer: '2' },
        { questionId: questions[1]?._id, selectedAnswer: '4' }
      ]
    }
  });

  await mongoose.connect(process.env.MONGODB_URI);
  const resultId = submit1.data?.result?._id;
  const result = await Result.findById(resultId).lean();
  const stf = await STF.findOne({ resultId }).lean();
  const sqfCount = await SQF.countDocuments({ resultId });
  await mongoose.disconnect();

  console.log(JSON.stringify({
    facultyRegister: facultyReg.status,
    studentRegister: studentReg.status,
    createTest: create.status,
    join: join.status,
    start: start.status,
    submitFirst: submit1.status,
    submitSecond: submit2.status,
    submitSecondMessage: submit2.data?.message,
    resultPersisted: Boolean(result),
    analyticsStudentTestFactPersisted: Boolean(stf),
    analyticsStudentQuestionFactCount: sqfCount,
  }, null, 2));
})();
