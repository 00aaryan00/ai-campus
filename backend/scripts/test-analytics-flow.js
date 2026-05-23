const base = "http://127.0.0.1:5000";

const j = (res) => res.json();

const request = async (path, options = {}) => {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await j(res).catch(() => ({}));
  return { status: res.status, body };
};

const uniq = Date.now();
const facultyEmail = `faculty.analytics.${uniq}@mail.com`;
const studentEmail = `student.analytics.${uniq}@mail.com`;
const password = "Pass1234";

(async () => {
  const results = [];

  const facultyReg = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Faculty A', email: facultyEmail, password, role: 'faculty', department: 'CSE' }),
  });
  results.push({ case: 'faculty register', ...facultyReg });

  const studentReg = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Student A', email: studentEmail, password, role: 'student', department: 'CSE' }),
  });
  results.push({ case: 'student register', ...studentReg });

  const facultyToken = facultyReg.body?.token;
  const studentToken = studentReg.body?.token;

  const testPayload = {
    title: `Analytics Test ${uniq}`,
    subject: 'Math',
    mode: 'common',
    duration: 30,
    instructions: 'Solve all questions',
    sets: {
      common: [
        {
          questionText: '2 + 2 = ?',
          options: ['2', '3', '4', '5'],
          correctAnswer: '4',
          marks: 1,
          difficultyLevel: 'easy',
          topic: 'Arithmetic',
          source: 'manual'
        },
        {
          questionText: '5 * 3 = ?',
          options: ['8', '15', '10', '12'],
          correctAnswer: '15',
          marks: 1,
          difficultyLevel: 'easy',
          topic: 'Multiplication',
          source: 'manual'
        }
      ]
    }
  };

  const createTest = await request('/api/tests/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify(testPayload),
  });
  results.push({ case: 'faculty create test', ...createTest });

  const test = createTest.body?.test;
  const testId = test?.id;
  const roomCode = test?.roomCode;
  const q1 = test?.questions?.common?.[0];
  const q2 = test?.questions?.common?.[1];

  const join = await request('/api/tests/join-by-code', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ roomCode }),
  });
  results.push({ case: 'student join test lobby', ...join });

  const start = await request(`/api/tests/${testId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ roomCode }),
  });
  results.push({ case: 'student start test', ...start });

  const submit = await request('/api/results/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      testId,
      answers: [
        { questionId: q1?.id, selectedAnswer: '4' },
        { questionId: q2?.id, selectedAnswer: '10' }
      ]
    }),
  });
  results.push({ case: 'student submit test (redis expected down)', ...submit });

  const myResults = await request('/api/results/my-results', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  results.push({ case: 'student fetch my-results', status: myResults.status, count: myResults.body?.count, success: myResults.body?.success });

  console.log(JSON.stringify(results, null, 2));
})();
