from typing import List, Literal

from fastapi import HTTPException

from models import StudentAnswer, EvaluationResponse


def evaluate_answers(
    student_answers: List[StudentAnswer],
    correct_answers: List[Literal["A", "B", "C", "D"]],
) -> EvaluationResponse:
    """
    Pure-Python evaluator — no LLM involved.

    Compares each student's selected_option against the corresponding
    correct_answer and computes scoring metrics.

    Raises HTTPException 400 if the list lengths do not match.
    """
    if len(student_answers) != len(correct_answers):
        raise HTTPException(
            status_code=400,
            detail="Answer count mismatch",
        )

    total_questions: int = len(correct_answers)
    result_per_question: List[bool] = []

    for i, answer in enumerate(student_answers):
        is_correct = answer.selected_option == correct_answers[i]
        result_per_question.append(is_correct)

    correct_count: int = sum(result_per_question)
    score: float = correct_count / total_questions if total_questions > 0 else 0.0
    accuracy_percent: float = round(score * 100, 2)

    return EvaluationResponse(
        total_questions=total_questions,
        correct_count=correct_count,
        score=score,
        accuracy_percent=accuracy_percent,
        result_per_question=result_per_question,
    )
