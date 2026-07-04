@echo off
echo Starting local development server with livereload...
start http://localhost:8000/
python "%~dp0devserver.py"
pause
