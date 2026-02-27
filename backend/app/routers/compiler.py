"""MicroPython cross-compiler API.
Compiles Python source to .mpy bytecode format for Pybricks hubs.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import subprocess
import tempfile
import os

router = APIRouter()


class CompileRequest(BaseModel):
    source_code: str
    filename: str = "main.py"


class CompileResponse(BaseModel):
    success: bool
    message: str
    size: int = 0


class SyntaxCheckRequest(BaseModel):
    source_code: str


class SyntaxCheckResponse(BaseModel):
    valid: bool
    error: str = ""
    line: int = 0
    column: int = 0


@router.post("/check", response_model=SyntaxCheckResponse)
async def check_syntax(request: SyntaxCheckRequest):
    """Check Python syntax without compiling."""
    try:
        compile(request.source_code, "<string>", "exec")
        return SyntaxCheckResponse(valid=True)
    except SyntaxError as e:
        return SyntaxCheckResponse(
            valid=False,
            error=str(e.msg),
            line=e.lineno or 0,
            column=e.offset or 0,
        )


@router.post("/compile", response_model=CompileResponse)
async def compile_program(request: CompileRequest):
    """Compile Python source code to .mpy bytecode.
    
    Uses mpy-cross to cross-compile for Pybricks firmware.
    The compiled .mpy file can be uploaded to the hub.
    """
    # First check syntax
    try:
        compile(request.source_code, request.filename, "exec")
    except SyntaxError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Syntax error at line {e.lineno}: {e.msg}",
        )

    # Try to compile with mpy-cross
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = os.path.join(tmpdir, request.filename)
            output_path = os.path.join(
                tmpdir, request.filename.replace(".py", ".mpy")
            )

            # Write source file
            with open(source_path, "w") as f:
                f.write(request.source_code)

            # Run mpy-cross
            result = subprocess.run(
                ["mpy-cross", "-o", output_path, source_path],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Compilation failed: {result.stderr}",
                )

            if os.path.exists(output_path):
                size = os.path.getsize(output_path)
                return CompileResponse(
                    success=True,
                    message=f"Compiled successfully ({size} bytes)",
                    size=size,
                )
            else:
                return CompileResponse(
                    success=True,
                    message="Compiled successfully (size unknown)",
                )

    except FileNotFoundError:
        # mpy-cross not installed - fall back to syntax check only
        return CompileResponse(
            success=True,
            message="Syntax valid (mpy-cross not available for bytecode compilation)",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Compilation timed out")


@router.post("/compile/download")
async def compile_and_download(request: CompileRequest):
    """Compile Python source and return the .mpy binary file."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = os.path.join(tmpdir, request.filename)
            output_path = os.path.join(
                tmpdir, request.filename.replace(".py", ".mpy")
            )

            with open(source_path, "w") as f:
                f.write(request.source_code)

            result = subprocess.run(
                ["mpy-cross", "-o", output_path, source_path],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Compilation failed: {result.stderr}",
                )

            with open(output_path, "rb") as f:
                content = f.read()

            return Response(
                content=content,
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{request.filename.replace(".py", ".mpy")}"'
                },
            )

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="mpy-cross is not installed. Install with: pip install mpy-cross",
        )
