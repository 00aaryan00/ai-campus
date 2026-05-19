const calculateTotalMarks = (questions) =>
  questions.reduce((sum, question) => sum + (question.marks || 0), 0);

const serializeQuestions = (questions) =>
  questions.map((question) => ({
    _id: question._id,
    questionText: question.questionText,
    options: question.options,
    marks: question.marks,
    type: question.type,
    difficultyLevel: question.difficultyLevel,
    topic: question.topic,
    source: question.source,
    isEdited: question.isEdited,
  }));

const buildTestLobbyPayload = (test, assignedSet, questions) => {
  const rawTest = typeof test.toObject === "function" ? test.toObject() : test;

  // Lobby payload is safe to show before exam start: metadata only, no question bodies.
  return {
    _id: rawTest._id,
    title: rawTest.title,
    subject: rawTest.subject,
    mode: rawTest.mode,
    duration: rawTest.duration,
    instructions: rawTest.instructions,
    status: rawTest.status,
    roomCode: rawTest.roomCode,
    assignedSet,
    questionCount: questions.length,
    totalMarks: calculateTotalMarks(questions),
  };
};

const buildStudentTestPayload = (test, questions, assignedSet) => {
  const rawTest = typeof test.toObject === "function" ? test.toObject() : test;

  // Student payload intentionally omits correctAnswer so evaluation remains backend-only.
  return {
    _id: rawTest._id,
    title: rawTest.title,
    subject: rawTest.subject,
    mode: rawTest.mode,
    duration: rawTest.duration,
    instructions: rawTest.instructions,
    status: rawTest.status,
    roomCode: rawTest.roomCode,
    assignedSet,
    totalMarks: calculateTotalMarks(questions),
    questions: serializeQuestions(questions),
  };
};

const buildFacultyTestPayload = (test, groupedQuestions) => {
  const rawTest = typeof test.toObject === "function" ? test.toObject() : test;

  const setTotals = Object.fromEntries(
    Object.entries(groupedQuestions).map(([setName, questions]) => [
      setName,
      calculateTotalMarks(questions),
    ])
  );

  return {
    ...rawTest,
    setTotals,
    sets: Object.fromEntries(
      Object.entries(groupedQuestions).map(([setName, questions]) => [setName, serializeQuestions(questions)])
    ),
  };
};

module.exports = {
  buildTestLobbyPayload,
  buildStudentTestPayload,
  buildFacultyTestPayload,
};
