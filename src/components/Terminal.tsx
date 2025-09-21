import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, Brain, Command, MessageSquare } from 'lucide-react';

interface CommandEntry {
  id: string;
  originalInput: string;
  command: string;
  output: string;
  timestamp: Date;
  isError: boolean;
  mode: 'manual' | 'natural_language';
  convertedCommand?: string;
}

const Terminal: React.FC = () => {
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [activeMode, setActiveMode] = useState<'manual' | 'natural_language'>('manual');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load command history from session storage on component mount
  useEffect(() => {
    const savedHistory = sessionStorage.getItem('terminal-command-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setSessionHistory(parsed);
      } catch (error) {
        console.error('Failed to parse saved command history:', error);
      }
    }

    // Check backend health and Gemini configuration
    checkBackendHealth();
  }, []);

  // Save command history to session storage whenever it changes
  useEffect(() => {
    if (sessionHistory.length > 0) {
      sessionStorage.setItem('terminal-command-history', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory]);

  // Auto-scroll to bottom when new commands are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Check backend health and configuration
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:5000/health');
      if (response.ok) {
        const health = await response.json();
        setIsConnected(true);
        setGeminiConfigured(health.gemini_configured || false);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  // Focus input when terminal is clicked
  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Execute command via Python backend
  const executeCommand = async (input: string, mode: 'manual' | 'natural_language') => {
    if (!input.trim()) return;

    setIsExecuting(true);
    const commandEntry: CommandEntry = {
      id: Date.now().toString(),
      originalInput: input,
      command: input,
      output: '',
      timestamp: new Date(),
      isError: false,
      mode: mode,
    };

    // Add command to history immediately
    setCommandHistory(prev => [...prev, commandEntry]);

    // Add to session history for navigation
    setSessionHistory(prev => {
      const newHistory = [...prev, input];
      // Keep only last 100 commands
      return newHistory.slice(-100);
    });
    setHistoryIndex(-1);

    try {
      const endpoint = mode === 'natural_language' ? '/natural-language' : '/execute';
      const payload = mode === 'natural_language' ? { query: input } : { cmd: input };

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update the command entry with the result
      setCommandHistory(prev =>
        prev.map(entry =>
          entry.id === commandEntry.id
            ? {
                ...entry,
                originalInput: result.original_query || result.command || input,
                command: result.command || input,
                convertedCommand: result.converted_command,
                output: result.output || 'Command executed successfully',
                isError: !result.success,
                mode: result.mode || mode,
              }
            : entry
        )
      );
      setIsConnected(true);
    } catch (error) {
      // Update the command entry with error
      setCommandHistory(prev =>
        prev.map(entry =>
          entry.id === commandEntry.id
            ? {
                ...entry,
                output: `Error: ${error instanceof Error ? error.message : 'Failed to execute command'}`,
                isError: true,
              }
            : entry
        )
      );
      setIsConnected(false);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() && !isExecuting) {
      executeCommand(currentInput, activeMode);
      setCurrentInput('');
    }
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sessionHistory.length > 0) {
        const newIndex = historyIndex === -1 ? sessionHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(sessionHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= sessionHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(sessionHistory[newIndex]);
        }
      }
    } else if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Clear terminal
  const clearTerminal = () => {
    setCommandHistory([]);
  };

  // Clear session history
  const clearHistory = () => {
    setSessionHistory([]);
    sessionStorage.removeItem('terminal-command-history');
    setHistoryIndex(-1);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-green-400 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <TerminalIcon size={20} />
          <span className="font-semibold">AI-Enhanced Terminal</span>
          {geminiConfigured && (
            <div className="flex items-center space-x-1 text-xs bg-blue-600 px-2 py-1 rounded">
              <Brain size={12} />
              <span>AI Ready</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={clearTerminal}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            onClick={clearHistory}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear History
          </button>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
              activeMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Command size={14} />
            <span>Manual Commands</span>
          </button>
          <button
            onClick={() => setActiveMode('natural_language')}
            disabled={!geminiConfigured}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
              activeMode === 'natural_language'
                ? 'bg-purple-600 text-white'
                : geminiConfigured
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <MessageSquare size={14} />
            <span>Natural Language</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 cursor-text"
        onClick={handleTerminalClick}
      >
        {/* Welcome Message */}
        {commandHistory.length === 0 && (
          <div className="text-gray-500 mb-4">
            <p>🚀 Welcome to AI-Enhanced Terminal</p>
            <p>🔧 Choose your interaction mode:</p>
            <div className="ml-4 mt-2 space-y-2">
              <div>
                <p className="text-blue-400">📝 Manual Commands:</p>
                <div className="ml-4 text-sm space-y-1">
                  <p>• Direct terminal commands: ls, pwd, cat file.txt</p>
                  <p>• Full shell syntax support</p>
                </div>
              </div>
              <div>
                <p className="text-purple-400">🧠 Natural Language:</p>
                <div className="ml-4 text-sm space-y-1">
                  <p>• "show me all files in current directory"</p>
                  <p>• "what's my current location"</p>
                  <p>• "create a folder called projects"</p>
                </div>
              </div>
            </div>
            <p className="mt-2">🔧 Use ↑/↓ arrows to navigate command history</p>
            {!geminiConfigured && (
              <p className="text-yellow-500 mt-2">⚠️ Natural language mode disabled (Gemini API not configured)</p>
            )}
          </div>
        )}

        {/* Command History */}
        {commandHistory.map((entry) => (
          <div key={entry.id} className="mb-3">
            {/* Command Input Line */}
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">$</span>
              <span className="text-white">{entry.originalInput}</span>
              <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${
                entry.mode === 'natural_language' ? 'bg-purple-600' : 'bg-blue-600'
              }`}>
                {entry.mode === 'natural_language' ? <Brain size={10} /> : <Command size={10} />}
                <span>{entry.mode === 'natural_language' ? 'AI' : 'CMD'}</span>
              </div>
              <span className="text-xs text-gray-500">
                {entry.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {/* Show converted command if AI was used */}
            {entry.mode === 'natural_language' && entry.convertedCommand && (
              <div className="flex items-center space-x-2 mt-1 text-purple-300">
                <Command size={12} />
                <span className="text-sm">→ {entry.convertedCommand}</span>
              </div>
            )}

            {/* Command Output */}
            {entry.output && (
              <div className={`mt-1 pl-4 whitespace-pre-wrap ${
                entry.isError ? 'text-red-400' : 'text-green-300'
              }`}>
                {entry.output}
              </div>
            )}

            {/* Loading indicator for current executing command */}
            {entry.output === '' && isExecuting && (
              <div className="mt-1 pl-4 text-yellow-400">
                <span>Executing...</span>
                <span className="animate-pulse">|</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Command Input */}
      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
            placeholder={
              activeMode === 'natural_language'
                ? "Ask in natural language (e.g., 'show me all files')..."
                : "Enter terminal command..."
            }
            autoFocus
          />
          <button
            type="submit"
            disabled={isExecuting || !currentInput.trim()}
            className={`p-2 rounded transition-colors ${
              isExecuting || !currentInput.trim()
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-green-400 hover:text-green-300 hover:bg-gray-700'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <div>
            {!isConnected && (
              <span className="text-red-400">
                Cannot connect to Python backend. Make sure it's running on localhost:5000
              </span>
            )}
            {activeMode === 'natural_language' && !geminiConfigured && (
              <span className="text-yellow-400">
                Natural language mode requires Gemini API configuration
              </span>
            )}
          </div>
          <div className="flex space-x-4">
            <span className={`px-2 py-1 rounded ${
              activeMode === 'natural_language' ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {activeMode === 'natural_language' ? 'Natural Language Mode' : 'Manual Command Mode'}
            </span>
            {sessionHistory.length > 0 && (
              <span>{sessionHistory.length} commands in history</span>
            )}
            <span>↑/↓ for history</span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Terminal;