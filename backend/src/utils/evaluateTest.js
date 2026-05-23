const evaluateTest = (questions, submittedAnswers) => {
  const answersByQuestionId = new Map();

  for (const answer of submittedAnswers) {
    answersByQuestionId.set(String(answer.questionId), answer.selectedAnswer);
  }

  const evaluatedAnswers = [];
  let score = 0;

  for (const question of questions) {
    const selectedAnswer = answersByQuestionId.get(String(question._id)) || "";
    const isCorrect = selectedAnswer === question.correctAnswer;
    const marksAwarded = isCorrect ? question.marks || 0 : 0;

    score += marksAwarded;
    evaluatedAnswers.push({
      questionId: question._id,
      selectedAnswer,
      isCorrect,
      marksAwarded,
      correctAnswer: question.correctAnswer,
      topic: question.topic || "",
    });
  }

  const totalMarks = questions.reduce((sum, question) => sum + (question.marks || 0), 0);
  const accuracy = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;

  return {
    answers: evaluatedAnswers,
    score,
    totalMarks,
    accuracy,
  };
};

module.exports = evaluateTest;
