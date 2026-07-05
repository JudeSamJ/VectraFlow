@echo off
echo Starting Synapse Celery Worker...
echo.
cd /d "%~dp0"
call .venv\Scripts\activate.bat
celery -A app.celery_worker.celery_app worker --loglevel=info --pool=solo --concurrency=1
pause
