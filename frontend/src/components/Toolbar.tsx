import React, { useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { bleService, BleEvent } from '../services/bleService';
import { pythonToBlocklyXml } from '../services/pythonToBlocks';
import {
  Bluetooth,
  BluetoothOff,
  Play,
  Square,
  Terminal as TerminalIcon,
  Sun,
  Moon,
  FolderOpen,
  FilePlus,
  Code2,
  Puzzle,
  Download,
  Upload,
  Trash2,
  Battery,
  BatteryLow,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';

const Toolbar: React.FC = () => {
  const {
    connectionState,
    setConnectionState,
    setHubName,
    setHubStatus,
    hubName,
    hubStatus,
    editorMode,
    setEditorMode,
    pythonCode,
    darkMode,
    toggleDarkMode,
    showTerminal,
    toggleTerminal,
    showFileExplorer,
    toggleFileExplorer,
    addTerminalLine,
    batteryLevel,
    programs,
    currentProgramId,
    addProgram,
    setCurrentProgram,
    setPythonCode,
    setBlocklyXml,
    blocklyXml,
    showAIChat,
    toggleAIChat,
  } = useStore();

  // BLE event handler
  const handleBleEvent = useCallback(
    (event: BleEvent) => {
      switch (event.type) {
        case 'connected':
          setConnectionState('connected');
          setHubName(event.data || 'Hub');
          addTerminalLine({
            text: `Connected to ${event.data}`,
            type: 'info',
            timestamp: Date.now(),
          });
          break;
        case 'disconnected':
          setConnectionState('disconnected');
          setHubName('');
          setHubStatus('idle');
          addTerminalLine({
            text: 'Disconnected from hub',
            type: 'info',
            timestamp: Date.now(),
          });
          break;
        case 'output':
          addTerminalLine({
            text: event.data || '',
            type: 'output',
            timestamp: Date.now(),
          });
          break;
        case 'error':
          addTerminalLine({
            text: event.data || 'Unknown error',
            type: 'error',
            timestamp: Date.now(),
          });
          break;
        case 'info':
          addTerminalLine({
            text: event.data || '',
            type: 'info',
            timestamp: Date.now(),
          });
          break;
        case 'status':
          if (event.status !== undefined) {
            const isRunning = (event.status & (1 << 6)) !== 0;
            setHubStatus(isRunning ? 'running' : 'idle');
          }
          break;
      }
    },
    [setConnectionState, setHubName, setHubStatus, addTerminalLine]
  );

  useEffect(() => {
    bleService.addEventListener(handleBleEvent);
    return () => bleService.removeEventListener(handleBleEvent);
  }, [handleBleEvent]);

  const handleConnect = async () => {
    if (connectionState === 'connected') {
      setConnectionState('disconnecting');
      await bleService.disconnect();
    } else if (connectionState === 'connecting') {
      // Allow cancelling a stuck connection
      bleService.abortConnection();
      setConnectionState('disconnected');
    } else if (connectionState === 'disconnected') {
      setConnectionState('connecting');
      try {
        await bleService.connect();
      } catch {
        setConnectionState('disconnected');
      }
    }
  };

  const handleRun = async () => {
    if (connectionState !== 'connected') {
      addTerminalLine({
        text: 'Not connected to hub. Please connect first.',
        type: 'error',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      await bleService.runProgram(pythonCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `Run failed: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }
  };

  const handleStop = async () => {
    if (connectionState !== 'connected') return;
    try {
      await bleService.stopProgram();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `Stop failed: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }
  };

  const handleNewProgram = () => {
    const name = prompt('Program name:', `program_${programs.length + 1}`);
    if (!name) return;

    const program = {
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

  const handleSave = () => {
    if (currentProgramId) {
      useStore.getState().updateProgram(currentProgramId, {
        pythonCode,
        blocklyXml,
        mode: editorMode,
      });
      addTerminalLine({
        text: 'Program saved',
        type: 'info',
        timestamp: Date.now(),
      });
    } else {
      handleNewProgram();
    }
  };

  const handleExport = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProgramId ? programs.find(p => p.id === currentProgramId)?.name || 'program' : 'program'}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.py';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPythonCode(reader.result as string);
        setEditorMode('python');
        addTerminalLine({
          text: `Imported: ${file.name}`,
          type: 'info',
          timestamp: Date.now(),
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSwitchToBlocks = () => {
    if (editorMode === 'python') {
      try {
        const { xml, warnings } = pythonToBlocklyXml(pythonCode);
        setBlocklyXml(xml);

        if (warnings.length > 0) {
          addTerminalLine({
            text: `Python→Blocks: converted with ${warnings.length} warning(s).`,
            type: 'info',
            timestamp: Date.now(),
          });
        } else {
          addTerminalLine({
            text: 'Python→Blocks: converted successfully.',
            type: 'info',
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addTerminalLine({
          text: `Python→Blocks conversion failed: ${message}`,
          type: 'error',
          timestamp: Date.now(),
        });
      }
    }

    setEditorMode('blocks');
  };

  const connectionColor =
    connectionState === 'connected'
      ? '#4caf50'
      : connectionState === 'connecting' || connectionState === 'disconnecting'
      ? '#ff9800'
      : undefined;

  return (
    <div className="toolbar">
      {/* Left: Connection & Run controls */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${connectionState === 'connected' ? 'active' : ''}`}
          onClick={handleConnect}
          title={
            connectionState === 'connected'
              ? `Disconnect from ${hubName}`
              : connectionState === 'connecting'
              ? 'Click to cancel connection'
              : 'Connect to Spike Prime Hub'
          }
        >
          {connectionState === 'connected' ? (
            <Bluetooth size={18} color={connectionColor} />
          ) : connectionState === 'connecting' ? (
            <Bluetooth size={18} color={connectionColor} className="pulse" />
          ) : (
            <BluetoothOff size={18} />
          )}
          <span className="toolbar-label">
            {connectionState === 'connected'
              ? hubName
              : connectionState === 'connecting'
              ? 'Cancel'
              : 'Connect'}
          </span>
        </button>

        <div className="toolbar-separator" />

        <button
          className="toolbar-btn run-btn"
          onClick={handleRun}
          disabled={connectionState !== 'connected' || hubStatus === 'running'}
          title="Run program (F5)"
        >
          <Play size={18} />
          <span className="toolbar-label">Run</span>
        </button>

        <button
          className="toolbar-btn stop-btn"
          onClick={handleStop}
          disabled={connectionState !== 'connected'}
          title="Stop program (F6)"
        >
          <Square size={18} />
          <span className="toolbar-label">Stop</span>
        </button>
      </div>

      {/* Center: Editor mode toggle */}
      <div className="toolbar-group toolbar-center">
        <div className="editor-mode-toggle">
          <button
            className={`mode-btn ${editorMode === 'python' ? 'active' : ''}`}
            onClick={() => setEditorMode('python')}
            title="Python Editor"
          >
            <Code2 size={16} />
            <span>Python</span>
          </button>
          <button
            className={`mode-btn ${editorMode === 'blocks' ? 'active' : ''}`}
            onClick={handleSwitchToBlocks}
            title="Block Editor"
          >
            <Puzzle size={16} />
            <span>Blocks</span>
          </button>
        </div>
      </div>

      {/* Right: File & View controls */}
      <div className="toolbar-group toolbar-right">
        <button className="toolbar-btn" onClick={handleNewProgram} title="New program">
          <FilePlus size={18} />
        </button>
        <button className="toolbar-btn" onClick={handleSave} title="Save program (Ctrl+S)">
          <Download size={18} />
        </button>
        <button className="toolbar-btn" onClick={handleExport} title="Export .py file">
          <Upload size={18} />
        </button>
        <button className="toolbar-btn" onClick={handleImport} title="Import .py file">
          <FolderOpen size={18} />
        </button>

        <div className="toolbar-separator" />

        <button
          className={`toolbar-btn ${showFileExplorer ? 'active' : ''}`}
          onClick={toggleFileExplorer}
          title="Toggle file explorer"
        >
          <FolderOpen size={18} />
        </button>
        <button
          className={`toolbar-btn ${showTerminal ? 'active' : ''}`}
          onClick={toggleTerminal}
          title="Toggle terminal"
        >
          <TerminalIcon size={18} />
        </button>
        <button
          className={`toolbar-btn ${showAIChat ? 'active' : ''}`}
          onClick={toggleAIChat}
          title="Toggle AI Assistant (Claude)"
        >
          <Sparkles size={18} />
          <span className="toolbar-label">AI</span>
        </button>

        <div className="toolbar-separator" />

        <button className="toolbar-btn" onClick={toggleDarkMode} title="Toggle dark mode">
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Status indicators */}
        {connectionState === 'connected' && (
          <div className="status-indicators">
            <Wifi size={14} color="#4caf50" />
            {batteryLevel > 0 && (
              <>
                {batteryLevel < 20 ? (
                  <BatteryLow size={14} color="#f44336" />
                ) : (
                  <Battery size={14} color="#4caf50" />
                )}
                <span className="battery-text">{batteryLevel}%</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
