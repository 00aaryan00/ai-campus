import json
import os
from typing import List, Dict, Any
from fastapi import HTTPException
from groq import AsyncGroq
from models import MCQQuestion, MCQOption

# Use llama-3.3-70b-versatile as requested/standard for high quality
MODEL_NAME = "llama-3.3-70b-versatile"

SYSTEM_PROMPT_BASE = (
    "You are an exam question generator. Your job is to return a JSON object of MCQ questions based on the provided transcript. "
    "Each question must have: 'question' (string), 'options' (object with keys A, B, C, D), "
    "'correct_answer' (one of A, B, C, D), 'difficulty' (string), and 'marks' (integer). "
    "Do NOT include any explanation, markdown, or text outside the JSON object."
)

async def _call_groq(prompt: str, user_content: str) -> Dict[str, Any]:
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content.strip()
        return json.loads(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")

def _validate_question(q: Dict[str, Any], index: int) -> MCQQuestion:
    required = ["question", "options", "correct_answer", "difficulty", "marks"]
    for field in required:
        if field not in q:
            raise HTTPException(status_code=422, detail=f"Missing field '{field}' in question at index {index}")
    
    opts = q["options"]
    if not isinstance(opts, dict) or not all(k in opts for k in ["A", "B", "C", "D"]):
        raise HTTPException(status_code=422, detail=f"Malformed options in question at index {index}")
    
    if q["correct_answer"] not in ["A", "B", "C", "D"]:
        raise HTTPException(status_code=422, detail=f"Invalid correct_answer in question at index {index}")
    
    return MCQQuestion(
        question=q["question"],
        options=MCQOption(**opts),
        correct_answer=q["correct_answer"],
        difficulty=q["difficulty"],
        marks=q["marks"]
    )

async def generate_same_test(transcript: str) -> List[MCQQuestion]:
    prompt = (
        SYSTEM_PROMPT_BASE + 
        " Generate exactly 15 MCQ questions from the transcript. "
        "Return a JSON object with a key 'questions' containing the list of 15 questions."
    )
    
    data = await _call_groq(prompt, f"Transcript: {transcript}")
    questions_data = data.get("questions", [])
    
    if len(questions_data) < 15:
         # Fallback/Retry logic if needed, but for now we'll just validate
         pass
         
    return [_validate_question(q, i) for i, q in enumerate(questions_data[:15])]

async def generate_adaptive_test(transcript: str) -> Dict[str, List[MCQQuestion]]:
    prompt = (
        SYSTEM_PROMPT_BASE + 
        " Generate 3 separate tests based on the transcript: Hard, Medium, and Easy. "
        "Each test must have exactly 15 questions. "
        "Return a JSON object with keys 'easy', 'medium', and 'hard', each containing a list of 15 questions."
    )
    
    data = await _call_groq(prompt, f"Transcript: {transcript}")
    
    result = {
        "easy": [_validate_question(q, i) for i, q in enumerate(data.get("easy", [])[:15])],
        "medium": [_validate_question(q, i) for i, q in enumerate(data.get("medium", [])[:15])],
        "hard": [_validate_question(q, i) for i, q in enumerate(data.get("hard", [])[:15])]
    }
    
    return result

# Legacy function for compatibility if needed
async def generate_questions(topic: str, difficulty: str, num_questions: int) -> List[MCQQuestion]:
    prompt = (
        SYSTEM_PROMPT_BASE + 
        f" Generate exactly {num_questions} questions on the topic {topic} at {difficulty} difficulty level. "
        "Return a JSON object with a key 'questions' containing the list."
    )
    data = await _call_groq(prompt, f"Topic: {topic}")
    return [_validate_question(q, i) for i, q in enumerate(data.get("questions", [])[:num_questions])]
