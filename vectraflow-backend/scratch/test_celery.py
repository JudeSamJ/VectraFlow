import asyncio
from app.celery_worker import celery_app
from app.tasks.ingestion_tasks import process_document_task

def test():
    print("Testing Celery task instantiation...")
    # We won't actually call .delay() because Redis isn't running and it would fail,
    # but we can verify the task is registered with the app.
    
    tasks = celery_app.tasks.keys()
    print(f"Registered tasks: {list(tasks)}")
    
    if "process_document_task" in tasks:
        print("Success: process_document_task is registered!")
    else:
        print("Error: Task not found in celery_app")

if __name__ == "__main__":
    test()
