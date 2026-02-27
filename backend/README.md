# Spike Prime Code - Backend
# FastAPI server for MicroPython compilation, program management, and documentation

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

This installs `pybricksdev`, used by the firmware endpoint to flash Pybricks firmware.

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

Create `backend/.env` and set:

```env
GEMINI_API_KEY=your_key_here
```

## API Docs

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Features

- **Program Management**: CRUD API for Python programs
- **MicroPython Compilation**: Cross-compile Python to .mpy format
- **WebSocket**: Real-time communication for live terminal output relay
- **Documentation**: Serve Pybricks API documentation
- **Examples**: Pre-built example programs for Spike Prime
