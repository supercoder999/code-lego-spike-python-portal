"""Program management API - CRUD operations for Python programs."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter()

# In-memory storage (replace with database in production)
programs_db: dict[str, dict] = {}


class ProgramCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    python_code: str = ""
    blockly_xml: str = ""
    mode: str = Field(default="python", pattern="^(python|blocks)$")


class ProgramUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    python_code: Optional[str] = None
    blockly_xml: Optional[str] = None
    mode: Optional[str] = Field(None, pattern="^(python|blocks)$")


class ProgramResponse(BaseModel):
    id: str
    name: str
    python_code: str
    blockly_xml: str
    mode: str
    created_at: str
    updated_at: str


@router.get("/", response_model=List[ProgramResponse])
async def list_programs():
    """List all saved programs."""
    return list(programs_db.values())


@router.get("/{program_id}", response_model=ProgramResponse)
async def get_program(program_id: str):
    """Get a specific program by ID."""
    if program_id not in programs_db:
        raise HTTPException(status_code=404, detail="Program not found")
    return programs_db[program_id]


@router.post("/", response_model=ProgramResponse, status_code=201)
async def create_program(program: ProgramCreate):
    """Create a new program."""
    program_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    program_data = {
        "id": program_id,
        "name": program.name,
        "python_code": program.python_code,
        "blockly_xml": program.blockly_xml,
        "mode": program.mode,
        "created_at": now,
        "updated_at": now,
    }
    programs_db[program_id] = program_data
    return program_data


@router.put("/{program_id}", response_model=ProgramResponse)
async def update_program(program_id: str, program: ProgramUpdate):
    """Update an existing program."""
    if program_id not in programs_db:
        raise HTTPException(status_code=404, detail="Program not found")

    existing = programs_db[program_id]
    update_data = program.model_dump(exclude_unset=True)
    existing.update(update_data)
    existing["updated_at"] = datetime.utcnow().isoformat()
    programs_db[program_id] = existing
    return existing


@router.delete("/{program_id}")
async def delete_program(program_id: str):
    """Delete a program."""
    if program_id not in programs_db:
        raise HTTPException(status_code=404, detail="Program not found")
    del programs_db[program_id]
    return {"message": "Program deleted"}
