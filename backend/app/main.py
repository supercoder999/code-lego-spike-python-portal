"""
Code LEGO Spike Python Portal - Backend Server
FastAPI application for managing programs, compilation, and documentation.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .routers import programs, compiler, examples, docs as docs_router, ai as ai_router, email as email_router
from .websocket import connection_manager

app = FastAPI(
    title="Code LEGO Spike Python Portal API",
    description="Backend API for LEGO Spike Prime programming IDE",
    version="1.0.0",
)

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(programs.router, prefix="/api/programs", tags=["Programs"])
app.include_router(compiler.router, prefix="/api/compiler", tags=["Compiler"])
app.include_router(examples.router, prefix="/api/examples", tags=["Examples"])
app.include_router(docs_router.router, prefix="/api/docs", tags=["Documentation"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(email_router.router, prefix="/api/email", tags=["Email"])


@app.get("/")
async def root():
    return {
        "name": "Code LEGO Spike Python Portal API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# WebSocket endpoint for real-time terminal relay
@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    await connection_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast terminal output to all connected clients
            await connection_manager.broadcast(data)
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
