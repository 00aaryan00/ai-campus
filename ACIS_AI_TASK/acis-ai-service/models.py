from typing import List, Literal, Dict
from pydantic import BaseModel


# ── Question Generation Models ──────────────────────────────────────────────

class MCQOption(BaseModel):
    A: str
    B: str
    C: str
    D: str


class MCQQuestion(BaseModel):
    question: str
    options: MCQOption
    correct_answer: Literal["A", "B", "C", "D"]
    difficulty: str
    marks: int


class TranscriptRequest(BaseModel):
    transcript: str
    total_questions: int = 15
    total_marks: int = 15
    difficulty: str = None


class SameTestResponse(BaseModel):
    mode: Literal["same"] = "same"
    questions: List[MCQQuestion]


class AdaptiveTestResponse(BaseModel):
    mode: Literal["adaptive"] = "adaptive"
    easy: List[MCQQuestion]
    medium: List[MCQQuestion]
    hard: List[MCQQuestion]


# ── Legacy Models (Kept for compatibility if needed) ─────────────────────────

class QuestionRequest(BaseModel):
    topic: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    num_questions: int = 5


class QuestionResponse(BaseModel):
    topic: str
    difficulty: str
    questions: List[MCQQuestion]


# ── Answer Evaluation Models ─────────────────────────────────────────────────

class StudentAnswer(BaseModel):
    question_index: int
    selected_option: Literal["A", "B", "C", "D"]


class EvaluationRequest(BaseModel):
    student_answers: List[StudentAnswer]
    correct_answers: List[Literal["A", "B", "C", "D"]]


class EvaluationResponse(BaseModel):
    total_questions: int
    correct_count: int
    score: float
    accuracy_percent: float
    result_per_question: List[bool]
