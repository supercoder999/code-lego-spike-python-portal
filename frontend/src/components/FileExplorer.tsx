import React, { useState, useRef, useEffect } from 'react';
import { useStore, Program } from '../store/useStore';
import { File, FilePlus, Trash2, FolderOpen, Pencil, Mail } from 'lucide-react';

const FileExplorer: React.FC = () => {
  const {
    programs,
    currentProgramId,
    setCurrentProgram,
    deleteProgram,
    addProgram,
    setPythonCode,
    setBlocklyXml,
    setEditorMode,
    showFileExplorer,
    editorMode,
    pythonCode,
    blocklyXml,
    renameProgram,
  } = useStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [emailCooldowns, setEmailCooldowns] = useState<Record<string, number>>({});
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Tick cooldown timers every second
  useEffect(() => {
    const activeCooldowns = Object.values(emailCooldowns).some((t) => t > Date.now());
    if (!activeCooldowns) return;
    const interval = setInterval(() => {
      setEmailCooldowns((prev) => {
        const updated = { ...prev };
        let changed = false;
        for (const id of Object.keys(updated)) {
          if (updated[id] <= Date.now()) {
            delete updated[id];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [emailCooldowns]);

  const handleSendEmail = async (e: React.MouseEvent, program: Program) => {
    e.stopPropagation();
    if (emailCooldowns[program.id] && emailCooldowns[program.id] > Date.now()) return;
    if (sendingEmail) return;

    setSendingEmail(program.id);
    try {
      const res = await fetch('http://localhost:8000/api/email/send-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_name: program.name,
          code: program.pythonCode,
          mode: program.mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = data.retry_after ?? 60;
          setEmailCooldowns((prev) => ({ ...prev, [program.id]: Date.now() + retryAfter * 1000 }));
          alert(`Please wait ${retryAfter}s before sending another email.`);
        } else {
          alert(data.detail || 'Failed to send email');
        }
        return;
      }
      // Success — set 60s cooldown
      setEmailCooldowns((prev) => ({ ...prev, [program.id]: Date.now() + 60_000 }));
    } catch (err) {
      alert('Failed to send email. Is the backend running?');
    } finally {
      setSendingEmail(null);
    }
  };

  const getEmailCooldownRemaining = (programId: string): number => {
    const expiry = emailCooldowns[programId];
    if (!expiry) return 0;
    return Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
  };

  if (!showFileExplorer) return null;

  const handleSelectProgram = (program: Program) => {
    setCurrentProgram(program.id);
    setPythonCode(program.pythonCode);
    setBlocklyXml(program.blocklyXml);
    setEditorMode(program.mode);
  };

  const handleDeleteProgram = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this program?')) {
      deleteProgram(id);
    }
  };

  const handleStartRename = (e: React.MouseEvent, program: Program) => {
    e.stopPropagation();
    setRenamingId(program.id);
    setRenameValue(program.name);
  };

  const handleFinishRename = () => {
    if (renamingId && renameValue.trim()) {
      renameProgram(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleNewProgram = () => {
    const name = prompt('Program name:', `program_${programs.length + 1}`);
    if (!name) return;

    const program: Program = {
      id: crypto.randomUUID(),
      name,
      pythonCode: editorMode === 'python' ? pythonCode : '',
      blocklyXml: editorMode === 'blocks' ? blocklyXml : '',
      mode: editorMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addProgram(program);
    setCurrentProgram(program.id);
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <FolderOpen size={14} />
        <span>Programs</span>
        <button
          className="file-explorer-action"
          onClick={handleNewProgram}
          title="New program"
        >
          <FilePlus size={14} />
        </button>
      </div>
      <div className="file-explorer-list">
        {programs.length === 0 ? (
          <div className="file-explorer-empty">
            <p>No programs yet.</p>
            <button className="file-explorer-create-btn" onClick={handleNewProgram}>
              <FilePlus size={16} />
              Create program
            </button>
          </div>
        ) : (
          [...programs].sort((a, b) => b.createdAt - a.createdAt).map((program) => {
            const cooldownSec = getEmailCooldownRemaining(program.id);
            const emailDisabled = cooldownSec > 0 || sendingEmail === program.id;
            return (
            <div
              key={program.id}
              className={`file-item ${
                currentProgramId === program.id ? 'active' : ''
              }`}
              onClick={() => handleSelectProgram(program)}
              onDoubleClick={(e) => handleStartRename(e, program)}
            >
              <File size={14} />
              {renamingId === program.id ? (
                <input
                  ref={renameInputRef}
                  className="file-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="file-name">{program.name}</span>
              )}
              <span className="file-mode">
                {program.mode === 'python' ? '.py' : '.blk'}
              </span>
              <button
                className={`file-email-btn ${emailDisabled ? 'disabled' : ''}`}
                onClick={(e) => handleSendEmail(e, program)}
                title={emailDisabled ? `Wait ${cooldownSec}s` : 'Email to admin'}
                disabled={emailDisabled}
              >
                <Mail size={12} />
                {cooldownSec > 0 && <span className="email-cooldown-badge">{cooldownSec}</span>}
              </button>
              <button
                className="file-rename-btn"
                onClick={(e) => handleStartRename(e, program)}
                title="Rename"
              >
                <Pencil size={12} />
              </button>
              <button
                className="file-delete"
                onClick={(e) => handleDeleteProgram(e, program.id)}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
