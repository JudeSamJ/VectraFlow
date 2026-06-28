from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
import uuid

router = APIRouter()

@router.post("/datasets")
async def create_eval_dataset(db: AsyncSession = Depends(get_db)):
    """
    Upload Q&A pairs for offline evaluation.
    """
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.post("/runs")
async def trigger_eval_run(dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Triggers an asynchronous evaluation run (LLM-as-a-judge) via Celery.
    """
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.get("/runs/{run_id}")
async def get_eval_results(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Retrieves metrics (Faithfulness, Answer Relevance, Context Precision).
    """
    raise HTTPException(status_code=501, detail="Not Implemented")
