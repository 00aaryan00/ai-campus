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
            max_tokens=8000,
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

async def _generate_exact_questions(transcript: str, target_count: int, target_marks: int, extra_instructions: str = "") -> List[MCQQuestion]:
    accumulated_questions = []
    remaining_count = target_count
    
    last_error = None
    for attempt in range(3):
        if remaining_count <= 0:
            break
            
        prompt = (
            SYSTEM_PROMPT_BASE + 
            f" {extra_instructions} "
            f"\n\nCRITICAL INSTRUCTION: You MUST generate EXACTLY {remaining_count} MCQ questions from the transcript. "
            f"Do NOT stop early. The system requires exactly {remaining_count} questions. "
            f"Return a JSON object with a key 'questions' containing the list of EXACTLY {remaining_count} questions."
        )
        
        try:
            data = await _call_groq(prompt, f"Transcript: {transcript}")
            q_data = data.get("questions", [])
            
            valid_qs = []
            for i, q in enumerate(q_data):
                try:
                    valid_qs.append(_validate_question(q, len(accumulated_questions) + i))
                except Exception:
                    pass
                    
            accumulated_questions.extend(valid_qs)
            remaining_count = target_count - len(accumulated_questions)
        except Exception as e:
            print(f"Error during Groq generation: {e}")
            last_error = e
            break

    if len(accumulated_questions) == 0 and last_error:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(last_error)}")

    # Fallback: duplicate if still short after 3 attempts to guarantee length
    if len(accumulated_questions) > 0 and len(accumulated_questions) < target_count:
        idx = 0
        while len(accumulated_questions) < target_count:
            copied_q = accumulated_questions[idx % len(accumulated_questions)].copy()
            accumulated_questions.append(copied_q)
            idx += 1
            
    # Trim if exceeded
    accumulated_questions = accumulated_questions[:target_count]
    
    # Natively allocate exact marks
    if target_count > 0:
        base_marks = target_marks // target_count
        marks_remainder = target_marks % target_count
        
        for i, q in enumerate(accumulated_questions):
            q.marks = base_marks + (1 if i < marks_remainder else 0)

    return accumulated_questions

async def generate_same_test(transcript: str, total_questions: int = 15, total_marks: int = 15, difficulty: str = None) -> List[MCQQuestion]:
    extra_instructions = ""
    if difficulty:
        extra_instructions = f"The difficulty level for ALL questions in this set MUST be '{difficulty}'."
    return await _generate_exact_questions(transcript, total_questions, total_marks, extra_instructions)

async def generate_adaptive_test(transcript: str, total_questions: int = 15, total_marks: int = 15) -> Dict[str, List[MCQQuestion]]:
    import asyncio
    
    easy_task = _generate_exact_questions(transcript, total_questions, total_marks, "The difficulty level for ALL questions in this set MUST be 'easy'.")
    medium_task = _generate_exact_questions(transcript, total_questions, total_marks, "The difficulty level for ALL questions in this set MUST be 'medium'.")
    hard_task = _generate_exact_questions(transcript, total_questions, total_marks, "The difficulty level for ALL questions in this set MUST be 'hard'.")
    
    easy_qs, medium_qs, hard_qs = await asyncio.gather(easy_task, medium_task, hard_task)
    
    return {
        "easy": easy_qs,
        "medium": medium_qs,
        "hard": hard_qs
    }

# Legacy function for compatibility if needed
async def generate_questions(topic: str, difficulty: str, num_questions: int) -> List[MCQQuestion]:
    prompt = (
        SYSTEM_PROMPT_BASE + 
        f" Generate exactly {num_questions} questions on the topic {topic} at {difficulty} difficulty level. "
        "Return a JSON object with a key 'questions' containing the list."
    )
    data = await _call_groq(prompt, f"Topic: {topic}")
    return [_validate_question(q, i) for i, q in enumerate(data.get("questions", [])[:num_questions])]
