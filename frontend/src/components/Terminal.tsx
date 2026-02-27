import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, TerminalSquare } from 'lucide-react';

const Terminal: React.FC = () => {
  const { terminalLines, clearTerminal, showTerminal, darkMode } = useStore();
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  if (!showTerminal) return null;

  return (
    <div className={`terminal-panel ${darkMode ? 'dark' : 'light'}`}>
      <div className="terminal-header">
        <div className="terminal-title">
          <TerminalSquare size={14} />
          <span>Output</span>
        </div>
        <button
          className="terminal-action-btn"
          onClick={clearTerminal}
          title="Clear terminal"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="terminal-content" ref={terminalRef}>
        {terminalLines.length === 0 ? (
          <div className="terminal-empty">
            <span>No output yet. Run a program to see output here.</span>
          </div>
        ) : (
          terminalLines.map((line, index) => (
            <div key={index} className={`terminal-line terminal-${line.type}`}>
              {line.type !== 'output' && (
                <span className="terminal-timestamp">
                  {new Date(line.timestamp).toLocaleTimeString()}
                </span>
              )}
              <span className="terminal-text">{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Terminal;
