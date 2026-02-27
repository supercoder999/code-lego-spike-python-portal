import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EditorMode = 'python' | 'blocks';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
export type HubStatus = 'idle' | 'running' | 'error';

export interface Program {
  id: string;
  name: string;
  pythonCode: string;
  blocklyXml: string;
  mode: EditorMode;
  createdAt: number;
  updatedAt: number;
}

export interface TerminalLine {
  text: string;
  type: 'output' | 'error' | 'info' | 'input';
  timestamp: number;
}

interface AppState {
  // Editor
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;

  // Current code
  pythonCode: string;
  setPythonCode: (code: string) => void;
  blocklyXml: string;
  setBlocklyXml: (xml: string) => void;

  // Programs / File management
  programs: Program[];
  currentProgramId: string | null;
  addProgram: (program: Program) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  setCurrentProgram: (id: string | null) => void;
  renameProgram: (id: string, name: string) => void;

  // Connection
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  hubName: string;
  setHubName: (name: string) => void;
  hubStatus: HubStatus;
  setHubStatus: (status: HubStatus) => void;
  batteryLevel: number;
  setBatteryLevel: (level: number) => void;

  // Terminal
  terminalLines: TerminalLine[];
  addTerminalLine: (line: TerminalLine) => void;
  clearTerminal: () => void;

  // UI
  showTerminal: boolean;
  toggleTerminal: () => void;
  showFileExplorer: boolean;
  toggleFileExplorer: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  showAIChat: boolean;
  toggleAIChat: () => void;
}

const DEFAULT_PYTHON_CODE = `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch

# Initialize the hub
hub = PrimeHub()

# Display a smiley face
hub.display.image([
    [100, 0, 0, 0, 100],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [100, 0, 0, 0, 100],
    [0, 100, 100, 100, 0],
])

# Wait 3 seconds
wait(3000)

# Beep!
hub.speaker.beep()
`;

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Editor
      editorMode: 'python',
      setEditorMode: (mode) => set({ editorMode: mode }),

      // Current code
      pythonCode: DEFAULT_PYTHON_CODE,
      setPythonCode: (code) => set({ pythonCode: code }),
      blocklyXml: '',
      setBlocklyXml: (xml) => set({ blocklyXml: xml }),

      // Programs
      programs: [],
      currentProgramId: null,
      addProgram: (program) =>
        set((state) => ({ programs: [...state.programs, program] })),
      updateProgram: (id, updates) =>
        set((state) => ({
          programs: state.programs.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        })),
      deleteProgram: (id) =>
        set((state) => ({
          programs: state.programs.filter((p) => p.id !== id),
          currentProgramId: state.currentProgramId === id ? null : state.currentProgramId,
        })),
      setCurrentProgram: (id) => set({ currentProgramId: id }),
      renameProgram: (id, name) =>
        set((state) => ({
          programs: state.programs.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        })),

      // Connection
      connectionState: 'disconnected',
      setConnectionState: (connectionState) => set({ connectionState }),
      hubName: '',
      setHubName: (hubName) => set({ hubName }),
      hubStatus: 'idle',
      setHubStatus: (hubStatus) => set({ hubStatus }),
      batteryLevel: 0,
      setBatteryLevel: (batteryLevel) => set({ batteryLevel }),

      // Terminal
      terminalLines: [],
      addTerminalLine: (line) =>
        set((state) => ({ terminalLines: [...state.terminalLines, line] })),
      clearTerminal: () => set({ terminalLines: [] }),

      // UI
      showTerminal: true,
      toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
      showFileExplorer: true,
      toggleFileExplorer: () => set((state) => ({ showFileExplorer: !state.showFileExplorer })),
      darkMode: true,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      showAIChat: false,
      toggleAIChat: () => set((state) => ({ showAIChat: !state.showAIChat })),
    }),
    {
      name: 'pybricks-ide-storage',
      // Only persist the fields we care about — NOT connection state or terminal
      partialize: (state) => ({
        editorMode: state.editorMode,
        pythonCode: state.pythonCode,
        blocklyXml: state.blocklyXml,
        programs: state.programs,
        currentProgramId: state.currentProgramId,
        darkMode: state.darkMode,
        showTerminal: state.showTerminal,
        showFileExplorer: state.showFileExplorer,
        showAIChat: state.showAIChat,
      }),
    },
  ),
);
