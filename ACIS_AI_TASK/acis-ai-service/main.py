import os
from dotenv import load_dotenv

# Load environment variables from .env BEFORE any other imports that read them
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    EvaluationRequest,
    EvaluationResponse,
    QuestionRequest,
    QuestionResponse,
    TranscriptRequest,
    SameTestResponse,
    AdaptiveTestResponse
)
from question_generator import (
    generate_questions, 
    generate_same_test, 
    generate_adaptive_test
)
from answer_evaluator import evaluate_answers

app = FastAPI(
    title="ACIS AI Service",
    version="1.1.0",
    description="AI Classroom Intelligence System — Question Generation from Transcripts",
)

# Enable CORS for frontend testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Validation helpers ───────────────────────────────────────────────────────

def _validate_question_request(request: QuestionRequest) -> None:
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    if not (1 <= request.num_questions <= 20):
        raise HTTPException(
            status_code=400,
            detail="num_questions must be between 1 and 20",
        )


# ── New Transcript Endpoints ────────────────────────────────────────────────

@app.post("/generate-same-test", response_model=SameTestResponse)
async def generate_same_test_endpoint(request: TranscriptRequest) -> SameTestResponse:
    """
    Generate 15 MCQs for everyone from the transcript.
    """
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")
    
    questions = await generate_same_test(request.transcript)
    return SameTestResponse(questions=questions)


@app.post("/generate-rankwise-test", response_model=AdaptiveTestResponse)
async def generate_rankwise_test_endpoint(request: TranscriptRequest) -> AdaptiveTestResponse:
    """
    Generate 3 separate tests (Easy, Medium, Hard) each with 15 MCQs.
    """
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")
    
    tests = await generate_adaptive_test(request.transcript)
    return AdaptiveTestResponse(
        easy=tests["easy"],
        medium=tests["medium"],
        hard=tests["hard"]
    )


# ── Legacy Endpoints ────────────────────────────────────────────────────────

@app.post("/generate-questions", response_model=QuestionResponse)
async def generate_questions_endpoint(request: QuestionRequest) -> QuestionResponse:
    """
    Generate MCQ questions using Groq for the given topic and difficulty.
    """
    _validate_question_request(request)

    questions = await generate_questions(
        topic=request.topic,
        difficulty=request.difficulty,
        num_questions=request.num_questions,
    )

    return QuestionResponse(
        topic=request.topic,
        difficulty=request.difficulty,
        questions=questions,
    )


@app.post("/evaluate-answers", response_model=EvaluationResponse)
def evaluate_answers_endpoint(request: EvaluationRequest) -> EvaluationResponse:
    """
    Evaluate student answers against the correct answers and return scoring metrics.
    """
    return evaluate_answers(
        student_answers=request.student_answers,
        correct_answers=request.correct_answers,
    )


@app.get("/health")
def health_check() -> dict:
    """
    Simple health-check endpoint.
    """
    return {"status": "ok", "service": "ACIS AI Service"}
