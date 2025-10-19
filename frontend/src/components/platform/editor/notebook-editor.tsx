'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { INotebookContent, ICell, ICellMetadata, IOutput } from '@jupyterlab/nbformat';
import { Play, Plus, Trash2, ChevronUp, ChevronDown, Code, Type, Check, RotateCcw, Square, Cloud, Cpu, HardDrive, Activity, Zap, MoreHorizontal, Copy, Maximize2, FileText, Download, Settings } from 'lucide-react';
import { onThemeChange } from './workspace-layout';
import { uploadFile } from '@/lib/api/files';
import { useProjectPresence } from './use-project-presence';
import { useRealtimeCollab } from './use-realtime-collab';
import ReactMarkdown from 'react-markdown';

interface NotebookEditorProps {
  projectId: string;
  filePath: string;
  content: string;
  onChange?: (content: string) => void;
}

interface NotebookOutput {
  output_type: string;
  data?: Record<string, unknown>;
  text?: string | string[];
  execution_count?: number | null;
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
  metadata?: Record<string, unknown>;
}

interface NotebookCell {
  id: string;
  cell_type: 'code' | 'markdown' | 'raw';
  execution_count: number | null;
  metadata: Record<string, unknown>;
  outputs: NotebookOutput[];
  source: string | string[];
  isRendered?: boolean; // For markdown cells - toggle between edit/preview
  executionStatus?: 'success' | 'error' | null; // Track execution status
  executionTime?: number; // Execution time in milliseconds
}

export function NotebookEditor({
  projectId,
  filePath,
  content,
  onChange,
}: NotebookEditorProps) {
  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());
  const [currentTheme, setCurrentTheme] = useState<string>('dark');

  // Monaco refs for collaboration - track currently focused cell
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const editorRefsMap = useRef<Map<string, import('monaco-editor').editor.IStandaloneCodeEditor>>(new Map());
  const activeCellEditorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const activeCellIdRef = useRef<string | null>(null);

  // Track presence for the notebook using the new system (with file path)
  useProjectPresence(projectId, filePath);

  // Enable real-time collaboration for the notebook
  // Pass all editors so cursors can be rendered in the correct cells
  const { myColor, broadcastCellAdded, broadcastCellDeleted } = useRealtimeCollab({
    projectId: projectId,
    fileName: filePath,
    editor: activeCellEditorRef.current,
    monaco: monacoRef.current,
    cellId: activeCellIdRef.current || undefined,
    editorRefsMap: editorRefsMap.current, // Pass all cell editors
    onCellAdded: (index: number) => {
      // Handle remote cell addition
      setCells(prev => {
        const newCellIndex = index + 1;
        const newCell: NotebookCell = {
          id: `cell-${newCellIndex}`,
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: ['']
        };
        const updated = [...prev.slice(0, index + 1), newCell, ...prev.slice(index + 1)];

        // Renumber all cells after insertion to maintain stable IDs
        const renumbered = updated.map((cell, idx) => ({
          ...cell,
          id: `cell-${idx}`
        }));

        return renumbered;
      });
    },
    onCellDeleted: (cellId: string) => {
      // Handle remote cell deletion
      setCells(prev => {
        const updated = prev.filter(cell => cell.id !== cellId);

        // Renumber all cells after deletion to maintain stable IDs
        const renumbered = updated.map((cell, idx) => ({
          ...cell,
          id: `cell-${idx}`
        }));

        return renumbered;
      });
    }
  });

  const [kernelId, setKernelId] = useState<string | null>(null);
  const [selectedRuntime, setSelectedRuntime] = useState<string>('localhost');
  const [runtimeStatus, setRuntimeStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [showRuntimeDropdown, setShowRuntimeDropdown] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [isRuntimeDropdownOpen, setIsRuntimeDropdownOpen] = useState(false);
  const [openOutputMenu, setOpenOutputMenu] = useState<string | null>(null);
  const [collapsedOutputs, setCollapsedOutputs] = useState<Set<string>>(new Set());
  const [openCellTypeMenu, setOpenCellTypeMenu] = useState<string | null>(null);
  const [showNotebookMenu, setShowNotebookMenu] = useState(true);
  const [activeDropdownMenu, setActiveDropdownMenu] = useState<string | null>(null);

  // Auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Available Docker container runtimes on different machines (in production, fetch from API)
  const availableRuntimes = [
    {
      id: 'localhost',
      name: 'Local Machine',
      url: 'http://localhost:8888',
      image: 'jupyter/scipy-notebook:latest',
      cpu: '8 cores',
      gpu: 'None',
      memory: '16 GB',
      storage: '50 GB',
      host: 'localhost',
      accessLevel: 'free',
      authRequired: false,
      available: true
    },
    {
      id: 'cloud-basic',
      name: 'Cloud Node 1',
      url: 'https://node1.algoflow.com',
      image: 'jupyter/scipy-notebook:latest',
      cpu: '4 cores',
      gpu: 'None',
      memory: '8 GB',
      storage: '100 GB SSD',
      host: 'node1.algoflow.com',
      accessLevel: 'standard',
      authRequired: true,
      available: false
    },
    {
      id: 'cloud-pro',
      name: 'GPU Node 2',
      url: 'https://gpu-node2.algoflow.com',
      image: 'jupyter/tensorflow-notebook:latest',
      cpu: '16 cores',
      gpu: 'NVIDIA T4 (16GB)',
      memory: '32 GB',
      storage: '500 GB NVMe',
      host: 'gpu-node2.algoflow.com',
      accessLevel: 'premium',
      authRequired: true,
      available: false
    },
    {
      id: 'team-shared',
      name: 'Team Node 3',
      url: 'https://team-node3.algoflow.com',
      image: 'jupyter/datascience-notebook:latest',
      cpu: '32 cores',
      gpu: 'NVIDIA A100 (40GB)',
      memory: '128 GB',
      storage: '1 TB NVMe',
      host: 'team-node3.algoflow.com',
      accessLevel: 'team',
      authRequired: true,
      available: false
    },
    {
      id: 'enterprise-dedicated',
      name: 'Enterprise Node 4',
      url: 'https://ent-node4.algoflow.com',
      image: 'custom/enterprise-notebook:v2',
      cpu: '64 cores',
      gpu: '2x A100 (80GB)',
      memory: '256 GB',
      storage: '2 TB NVMe',
      host: 'ent-node4.algoflow.com',
      accessLevel: 'enterprise',
      authRequired: true,
      available: false
    },
    {
      id: 'admin-cluster',
      name: 'Admin Cluster Node',
      url: 'https://admin-cluster.algoflow.com',
      image: 'custom/admin-cluster:latest',
      cpu: '128 cores',
      gpu: '4x H100 (80GB)',
      memory: '512 GB',
      storage: '10 TB NVMe RAID',
      host: 'admin-cluster.algoflow.com',
      accessLevel: 'admin',
      authRequired: true,
      available: false
    },
  ];

  // Debounced save to database
  const debouncedSave = useCallback((updatedCells: NotebookCell[]) => {
    if (!projectId || !filePath) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');

    // Set new timeout to save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Convert cells back to .ipynb format
        const notebook: INotebookContent = {
          cells: updatedCells.map(cell => ({
            cell_type: cell.cell_type,
            execution_count: cell.execution_count,
            metadata: cell.metadata as Partial<ICellMetadata>,
            outputs: cell.outputs as IOutput[],
            source: Array.isArray(cell.source) ? cell.source : [cell.source]
          })) as ICell[],
          metadata: {
            kernelspec: {
              display_name: 'Python 3',
              language: 'python',
              name: 'python3'
            },
            language_info: {
              name: 'python',
              version: '3.x'
            }
          },
          nbformat: 4,
          nbformat_minor: 5
        };

        const notebookContent = JSON.stringify(notebook, null, 2);
        await uploadFile(projectId, filePath, notebookContent);
        console.log('[NotebookEditor] Auto-saved:', filePath);
        setSaveStatus('saved');
        setLastSavedTime(new Date());
      } catch (error) {
        console.error('[NotebookEditor] Auto-save failed:', error);
        setSaveStatus('error');
      }
    }, 1000);
  }, [projectId, filePath]);

  // Time since last save (update every second)
  const [timeSinceSave, setTimeSinceSave] = useState('just now');
  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastSavedTime.getTime()) / 1000);
      if (seconds < 5) {
        setTimeSinceSave('just now');
      } else if (seconds < 60) {
        setTimeSinceSave(`${seconds}s ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceSave(`${minutes}m ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeSinceSave(`${hours}h ago`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSavedTime]);

  // Listen for theme changes
  useEffect(() => {
    const unsubscribe = onThemeChange((theme) => {
      setCurrentTheme(theme);
    });
    return unsubscribe;
  }, []);

  // Add cursor styles for collaboration
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'notebook-collab-cursor-styles';
    style.innerHTML = `
      .remote-cursor-bar {
        color: ${myColor};
        font-weight: bold;
        animation: blink 1s infinite;
      }
      .remote-cursor-name {
        background: ${myColor};
        color: white;
        padding: 2px 4px;
        border-radius: 2px;
        font-size: 10px;
        margin-right: 2px;
      }
      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById('notebook-collab-cursor-styles');
      if (existing) {
        document.head.removeChild(existing);
      }
    };
  }, [myColor]);

  // Parse notebook on mount
  useMemo(() => {
    try {
      const parsed = JSON.parse(content) as INotebookContent;
      const cellsWithIds = (parsed.cells || []).map((cell, index): NotebookCell => ({
        id: `cell-${index}`,
        cell_type: cell.cell_type as 'code' | 'markdown' | 'raw',
        execution_count: ('execution_count' in cell ? cell.execution_count : null) as number | null,
        metadata: cell.metadata || {},
        outputs: ('outputs' in cell ? cell.outputs : []) as unknown as NotebookOutput[],
        source: cell.source
      }));
      // Mark markdown cells as rendered by default
      const cellsWithRendered = cellsWithIds.map(cell => ({
        ...cell,
        isRendered: cell.cell_type === 'markdown' ? true : cell.isRendered
      }));

      setCells(cellsWithRendered);

      // Outputs are open by default - no need to collapse them
    } catch (err) {
      console.error('Failed to parse notebook:', err);
    }
  }, [content]);

  // Force renumber all cells on mount to ensure stable IDs across sessions
  useEffect(() => {
    setCells(prev => {
      // Check if any cells have non-standard IDs (e.g., timestamp-based)
      const hasNonstandardIds = prev.some((cell, idx) => cell.id !== `cell-${idx}`);

      if (hasNonstandardIds) {
        console.log('[NotebookEditor] Renumbering cells with non-standard IDs');
        const renumbered = prev.map((cell, idx) => ({
          ...cell,
          id: `cell-${idx}`
        }));
        // Save the renumbered cells
        debouncedSave(renumbered);
        return renumbered;
      }

      return prev;
    });
  }, []); // Run only on mount

  const updateCell = (id: string, source: string) => {
    setCells(prev => {
      const updated = prev.map(cell =>
        cell.id === id ? { ...cell, source: [source] } : cell
      );
      debouncedSave(updated);
      return updated;
    });
  };

  const addCell = (index: number, cellType: 'code' | 'markdown' = 'code') => {
    console.log('[NotebookEditor] Adding cell at index:', index, 'type:', cellType);
    setCells(prev => {
      // Calculate new cell index based on position
      const newCellIndex = index + 1;
      const newCell: NotebookCell = {
        id: `cell-${newCellIndex}`,
        cell_type: cellType,
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [''],
        isRendered: cellType === 'markdown' ? false : undefined
      };
      const updated = [...prev.slice(0, index + 1), newCell, ...prev.slice(index + 1)];

      // Renumber all cells after insertion to maintain stable IDs
      const renumbered = updated.map((cell, idx) => ({
        ...cell,
        id: `cell-${idx}`
      }));

      debouncedSave(renumbered);
      return renumbered;
    });
    // Broadcast the cell addition to other users
    console.log('[NotebookEditor] Broadcasting cell addition at index:', index);
    broadcastCellAdded(index);
  };

  const deleteCell = (id: string) => {
    setCells(prev => {
      const updated = prev.filter(cell => cell.id !== id);

      // Renumber all cells after deletion to maintain stable IDs
      const renumbered = updated.map((cell, idx) => ({
        ...cell,
        id: `cell-${idx}`
      }));

      debouncedSave(renumbered);
      return renumbered;
    });
    // Broadcast the cell deletion to other users
    broadcastCellDeleted(id);
  };

  const moveCell = (id: string, direction: 'up' | 'down') => {
    setCells(prev => {
      const index = prev.findIndex(cell => cell.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newCells = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newCells[index], newCells[targetIndex]] = [newCells[targetIndex], newCells[index]];
      debouncedSave(newCells);
      return newCells;
    });
  };

  const switchCellType = (id: string, newType: 'code' | 'markdown' | 'raw') => {
    setCells(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, cell_type: newType, isRendered: false, outputs: [], execution_count: null } : c
      );
      debouncedSave(updated);
      return updated;
    });
  };

  // Connect to runtime and create Python kernel
  const connectToRuntime = async (runtimeId: string) => {
    setRuntimeStatus('connecting');
    setSelectedRuntime(runtimeId);

    try {
      // In production, this would connect to different runtime URLs
      // For now, always use localhost
      const runtime = availableRuntimes.find(r => r.id === runtimeId);
      if (!runtime) return;

      // Create a new Python3 kernel on the runtime
      const startResponse = await fetch('/jupyter/api/kernels', {
        method: 'POST',
        headers: {
          'Authorization': `token algoflow-dev-token`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'python3' })
      });

      const kernel = await startResponse.json();
      setKernelId(kernel.id);
      setRuntimeStatus('connected');
      setShowRuntimeDropdown(false);
    } catch (error) {
      console.error('Failed to connect to runtime:', error);
      setRuntimeStatus('error');
    }
  };

  // Restart kernel
  const restartKernel = async () => {
    if (!kernelId) return;
    setRuntimeStatus('connecting');
    try {
      await fetch(`/jupyter/api/kernels/${kernelId}/restart`, {
        method: 'POST',
        headers: { 'Authorization': `token algoflow-dev-token` }
      });

      // Clear all execution counts when kernel restarts
      setCells(prev => {
        const updated = prev.map(cell => ({
          ...cell,
          execution_count: null,
          outputs: [],
          executionStatus: null,
          executionTime: undefined
        }));
        debouncedSave(updated);
        return updated;
      });

      setRuntimeStatus('connected');
    } catch (error) {
      console.error('Failed to restart kernel:', error);
      setRuntimeStatus('error');
    }
  };

  // Execute single cell via WebSocket
  const executeCell = async (id: string) => {
    const cell = cells.find(c => c.id === id);
    if (!cell) return;

    // For markdown cells, just toggle isRendered
    if (cell.cell_type === 'markdown') {
      setCells(prev => {
        const updated = prev.map(c =>
          c.id === id ? { ...c, isRendered: !c.isRendered } : c
        );
        debouncedSave(updated);
        return updated;
      });
      return;
    }

    // Raw cells should not be executed
    if (cell.cell_type === 'raw') {
      return;
    }

    // Show runtime dropdown if not connected
    if (!kernelId) {
      setShowRuntimeDropdown(true);
      return;
    }

    setExecutingCells(prev => new Set(prev).add(id));

    // Expand output if it's collapsed
    if (collapsedOutputs.has(id)) {
      const newCollapsed = new Set(collapsedOutputs);
      newCollapsed.delete(id);
      setCollapsedOutputs(newCollapsed);
    }

    try {
      const code = Array.isArray(cell.source) ? cell.source.join('\n') : cell.source;

      // Use WebSocket for execution
      const wsUrl = `ws://localhost:8888/api/kernels/${kernelId}/channels`;
      const ws = new WebSocket(wsUrl);

      const outputs: NotebookOutput[] = [];
      let executionCount = cell.execution_count || 0;

      let msgId: string;
      let executingStarted = false;
      let executionStartTime: number = 0;

      ws.onopen = () => {
        // Send execute_request message
        msgId = `execute_${Date.now()}`;
        const msg = {
          header: {
            msg_id: msgId,
            username: 'algoflow',
            session: kernelId,
            msg_type: 'execute_request',
            version: '5.3'
          },
          parent_header: {},
          metadata: {},
          content: {
            code: code,
            silent: false,
            store_history: true,
            user_expressions: {},
            allow_stdin: false
          }
        };
        ws.send(JSON.stringify(msg));
        console.log('[Notebook] Sent execute request:', msgId);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        // Only process messages related to our execution
        if (msg.parent_header && msg.parent_header.msg_id !== msgId) {
          return;
        }

        console.log('[Notebook] WebSocket message:', msg.msg_type, msg);

        // Track when execution starts
        if (msg.msg_type === 'status' && msg.content.execution_state === 'busy') {
          executingStarted = true;
          executionStartTime = Date.now();
        }

        // Handle execution count
        if (msg.msg_type === 'execute_input' && msg.content.execution_count) {
          executionCount = msg.content.execution_count;
        }

        // Handle outputs
        if (msg.msg_type === 'stream') {
          console.log('[Notebook] Stream output:', msg.content);
          // Check if we already have a stream output for this name, and append to it
          const existingStreamIndex = outputs.findIndex(
            o => o.output_type === 'stream' && o.name === msg.content.name
          );
          if (existingStreamIndex >= 0) {
            // Append to existing stream output
            outputs[existingStreamIndex].text += msg.content.text;
          } else {
            // Create new stream output
            outputs.push({
              output_type: 'stream',
              name: msg.content.name,
              text: msg.content.text
            });
          }
        } else if (msg.msg_type === 'execute_result') {
          console.log('[Notebook] Execute result:', msg.content);
          outputs.push({
            output_type: 'execute_result',
            execution_count: msg.content.execution_count,
            data: msg.content.data,
            metadata: msg.content.metadata
          });
        } else if (msg.msg_type === 'display_data') {
          console.log('[Notebook] Display data:', msg.content);
          outputs.push({
            output_type: 'display_data',
            data: msg.content.data,
            metadata: msg.content.metadata
          });
        } else if (msg.msg_type === 'error') {
          console.log('[Notebook] Error:', msg.content);
          outputs.push({
            output_type: 'error',
            ename: msg.content.ename,
            evalue: msg.content.evalue,
            traceback: msg.content.traceback
          });
        }

        // When execution is complete, update cell (only if it started)
        if (msg.msg_type === 'status' && msg.content.execution_state === 'idle' && executingStarted) {
          console.log('[Notebook] Execution complete. Outputs:', outputs);

          // Calculate execution time
          const executionTime = Date.now() - executionStartTime;

          // Determine execution status (success or error)
          const hasError = outputs.some(output => output.output_type === 'error');
          const executionStatus: 'success' | 'error' = hasError ? 'error' : 'success';

          setCells(prev => {
            const updated = prev.map(c =>
              c.id === id ? {
                ...c,
                execution_count: executionCount,
                outputs: outputs,
                executionStatus: executionStatus,
                executionTime: executionTime
              } : c
            );
            // Auto-save after execution completes (includes outputs like plots)
            debouncedSave(updated);
            return updated;
          });
          ws.close();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

      ws.onclose = () => {
        setExecutingCells(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      };

    } catch (error) {
      console.error('Failed to execute cell:', error);
      setExecutingCells(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Run all cells - SEQUENTIALLY to avoid race conditions
  const runAllCells = async () => {
    if (!kernelId) {
      setShowRuntimeDropdown(true);
      return;
    }
    // Execute cells one at a time, waiting for each to complete
    for (const cell of cells) {
      if (cell.cell_type === 'code') {
        await executeCell(cell.id);
        // Wait for cell to finish executing before moving to next
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!executingCells.has(cell.id)) {
              clearInterval(checkInterval);
              resolve(true);
            }
          }, 100);
        });
      }
    }
  };

  // Clear all outputs
  const clearAllOutputs = () => {
    setCells(prev => prev.map(cell => ({
      ...cell,
      outputs: [],
      execution_count: null,
      executionStatus: null,
      executionTime: undefined
    })));
  };

  // Interrupt kernel
  const interruptKernel = async () => {
    if (!kernelId) return;
    try {
      await fetch(`/jupyter/api/kernels/${kernelId}/interrupt`, {
        method: 'POST',
        headers: { 'Authorization': `token algoflow-dev-token` }
      });
      setExecutingCells(new Set());
    } catch (error) {
      console.error('Failed to interrupt kernel:', error);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Notebook Menu Bar */}
      <div className={`flex items-center justify-between px-2 py-1 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 transition-all ${showNotebookMenu ? '' : 'hidden'}`}>
        <div className="flex items-center gap-1 flex-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdownMenu(activeDropdownMenu === 'file' ? null : 'file')}
              className="px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              File
            </button>
            {activeDropdownMenu === 'file' && (
              <div className="absolute z-30 top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify({ cells, metadata: {} }, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filePath?.split('/').pop() || 'notebook.ipynb';
                    a.click();
                    URL.revokeObjectURL(url);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdownMenu(activeDropdownMenu === 'edit' ? null : 'edit')}
              className="px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              Edit
            </button>
            {activeDropdownMenu === 'edit' && (
              <div className="absolute z-30 top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                <button
                  onClick={() => {
                    if (confirm('Clear all cell outputs?')) {
                      setCells(cells.map(cell => ({
                        ...cell,
                        outputs: [],
                        execution_count: null
                      })));
                    }
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  Clear All Outputs
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete all cells?')) {
                      setCells([{
                        id: `cell-${Date.now()}`,
                        cell_type: 'code',
                        source: '',
                        outputs: [],
                        execution_count: null,
                        metadata: {}
                      }]);
                    }
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  Delete All Cells
                </button>
              </div>
            )}
          </div>

          {/* Kernel Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdownMenu(activeDropdownMenu === 'kernel' ? null : 'kernel')}
              className="px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              Kernel
            </button>
            {activeDropdownMenu === 'kernel' && (
              <div className="absolute z-30 top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                <button
                  onClick={() => {
                    restartKernel();
                    setActiveDropdownMenu(null);
                  }}
                  disabled={runtimeStatus !== 'connected'}
                  className="w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restart Kernel
                </button>
                <button
                  onClick={() => {
                    if (runtimeStatus === 'connected') {
                      // Disconnect by setting status - kernel connection will be handled by useEffect
                      setRuntimeStatus('disconnected');
                      setKernelId(null);
                    } else {
                      // Open runtime selection dropdown
                      setShowRuntimeDropdown(true);
                    }
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                >
                  {runtimeStatus === 'connected' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {runtimeStatus === 'connected' ? 'Disconnect' : 'Select Runtime'}
                </button>
                <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1"></div>
                <button
                  onClick={() => {
                    restartKernel();
                    setTimeout(() => runAllCells(), 1000);
                    setActiveDropdownMenu(null);
                  }}
                  disabled={runtimeStatus !== 'connected'}
                  className="w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restart & Run All
                </button>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdownMenu(activeDropdownMenu === 'settings' ? null : 'settings')}
              className="px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              Settings
            </button>
            {activeDropdownMenu === 'settings' && (
              <div className="absolute z-30 top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                <button
                  onClick={() => setActiveDropdownMenu(null)}
                  className="w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Notebook Settings
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

          {/* Filename display */}
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 px-2">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-medium">{filePath?.split('/').pop() || 'Untitled.ipynb'}</span>
          </div>
        </div>

        {/* Right side - Status and Info */}
        <div className="flex items-center gap-3">
          {/* Kernel Status */}
          {runtimeStatus === 'connected' && kernelId && (
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 rounded">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-medium">
                {availableRuntimes.find(r => r.id === selectedRuntime)?.name || 'Local'}
              </span>
            </div>
          )}

          {/* Connection Status Badge */}
          <div className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 ${
            runtimeStatus === 'connected'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              runtimeStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            {runtimeStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Icon Toolbar - Jupyter style */}
      <div className="flex items-center justify-between px-2 py-0.5 border-b border-neutral-200 dark:border-neutral-700 bg-background overflow-visible">
        {/* Left side - Icon buttons */}
        <div className="flex items-center gap-0.5">
          {/* Add cell at end */}
          <button
            onClick={() => addCell(cells.length - 1)}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            title="Add cell at end"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Cut, Copy, Paste placeholders */}
          <button className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Cut">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Copy">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Paste">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </button>

          <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-600 mx-0.5"></div>

          {/* Run all cells sequentially */}
          <button
            onClick={runAllCells}
            disabled={runtimeStatus === 'connecting' || cells.length === 0}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Run all cells (executes sequentially to prevent race conditions)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" /></svg>
          </button>

          {/* Stop */}
          <button
            onClick={interruptKernel}
            disabled={!kernelId || executingCells.size === 0}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Interrupt"
          >
            <Square className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-600 mx-0.5"></div>

          {/* Restart */}
          <button
            onClick={restartKernel}
            disabled={!kernelId || runtimeStatus === 'connecting'}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Restart kernel"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-600 mx-0.5"></div>

          {/* Cell type dropdown - context aware */}
          <select
            value={selectedCellId ? cells.find(c => c.id === selectedCellId)?.cell_type || 'code' : 'code'}
            onChange={(e) => {
              if (selectedCellId) {
                switchCellType(selectedCellId, e.target.value as 'code' | 'markdown');
              }
            }}
            disabled={!selectedCellId}
            className={`px-3 py-0.5 text-xs font-medium rounded border ${
              selectedCellId
                ? 'border-blue-400 dark:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500'
            } hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer disabled:cursor-not-allowed`}
            title={selectedCellId ? 'Change cell type' : 'Select a cell to change its type'}
          >
            <option value="code">Code</option>
            <option value="markdown">Markdown</option>
            <option value="raw">Raw</option>
          </select>
        </div>

        {/* Right side - Auto-save status, Charts, Runtime dropdown, and Collapse */}
        <div className="flex items-center gap-2 overflow-visible">
          {/* Auto-save status - Cloud with check inside */}
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="relative">
              <Cloud className={`w-3.5 h-3.5 ${
                saveStatus === 'saved' ? 'text-green-600 dark:text-green-400' :
                saveStatus === 'saving' ? 'text-blue-600 dark:text-blue-400 animate-pulse' :
                'text-red-600 dark:text-red-400'
              }`} />
              {saveStatus === 'saved' && (
                <Check className="w-1.5 h-1.5 text-green-600 dark:text-green-400 absolute bottom-0 right-0" />
              )}
            </div>
            <span className="text-[10px] font-medium">
              {saveStatus === 'saved' ? `Saved ${timeSinceSave}` : saveStatus === 'saving' ? 'Saving...' : 'Error'}
            </span>
          </div>

          {/* Charts with attached chevron dropdown - single rectangle button */}
          <button
            onClick={() => setShowRuntimeDropdown(!showRuntimeDropdown)}
            className="relative flex items-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors h-[26px]"
            title="Click to change runtime"
          >
            {runtimeStatus === 'connected' ? (
              <div className="flex flex-col gap-0 px-1.5 py-0.5">
                {/* CPU Row */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-medium text-neutral-600 dark:text-neutral-400 w-6">CPU</span>
                  <div className="flex items-end gap-[0.5px] h-2 w-10">
                    {[12, 15, 18, 23, 19, 25, 21, 23, 20, 24, 23, 22].map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-blue-500 dark:bg-blue-600"
                        style={{ height: `${(val / 25) * 8}px` }}
                      ></div>
                    ))}
                  </div>
                  <span className="text-[8px] font-bold text-neutral-700 dark:text-neutral-300 w-5 text-right">23%</span>
                </div>

                {/* GPU Row */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-medium text-neutral-600 dark:text-neutral-400 w-6">GPU</span>
                  <div className="flex items-end gap-[0.5px] h-2 w-10">
                    {[8, 12, 15, 18, 16, 20, 22, 19, 21, 23, 22, 20].map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-green-500 dark:bg-green-600"
                        style={{ height: `${(val / 25) * 8}px` }}
                      ></div>
                    ))}
                  </div>
                  <span className="text-[8px] font-bold text-neutral-700 dark:text-neutral-300 w-5 text-right">20%</span>
                </div>
              </div>
            ) : (
              <div className="px-3 flex items-center h-full">
                <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">Select Runtime</span>
              </div>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700"></div>

            {/* Chevron icon - seamlessly attached */}
            <div className="px-1.5 flex items-center group">
              <svg className="w-3 h-3 text-neutral-500 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Toggle Info Bar */}
          <button
            onClick={() => setShowNotebookMenu(!showNotebookMenu)}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
            title={showNotebookMenu ? "Hide notebook info" : "Show notebook info"}
          >
            {showNotebookMenu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Unified Compute Modal */}
      {showRuntimeDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setShowRuntimeDropdown(false)}
          ></div>

          {/* Centered Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-visible">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Select Compute</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Choose runtime for notebook execution</p>
                      </div>
                      <button
                        onClick={() => setShowRuntimeDropdown(false)}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Custom Runtime Dropdown */}
                      <div className="mb-6 relative">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Select Runtime
                        </label>
                        <div className="relative z-[70]">
                          {/* Dropdown Button */}
                          <button
                            onClick={() => setIsRuntimeDropdownOpen(!isRuntimeDropdownOpen)}
                            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                          >
                            {(() => {
                              const selectedRuntimeData = availableRuntimes.find(r => r.id === selectedRuntime);
                              if (!selectedRuntimeData) return null;

                              const accessLevelColors = {
                                free: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                                standard: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                                premium: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
                                team: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                                enterprise: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                                admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              };

                              return (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${
                                      runtimeStatus === 'connected' ? 'bg-green-500' : selectedRuntimeData.available ? 'bg-yellow-500' : 'bg-neutral-400'
                                    }`}></div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{selectedRuntimeData.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${accessLevelColors[selectedRuntimeData.accessLevel as keyof typeof accessLevelColors]}`}>
                                          {selectedRuntimeData.accessLevel}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>{selectedRuntimeData.image}</span>
                                        <span>•</span>
                                        <span>{selectedRuntimeData.cpu}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <svg className={`w-4 h-4 text-neutral-500 transition-transform ${isRuntimeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              );
                            })()}
                          </button>

                          {/* Dropdown Menu */}
                          {isRuntimeDropdownOpen && (
                            <div className="absolute z-[60] w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                              {availableRuntimes.map((runtime) => {
                                const accessLevelColors = {
                                  free: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                                  standard: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                                  premium: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
                                  team: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                                  enterprise: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                                  admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                };

                                return (
                                  <button
                                    key={runtime.id}
                                    onClick={() => {
                                      if (runtime.available) {
                                        connectToRuntime(runtime.id);
                                        setIsRuntimeDropdownOpen(false);
                                      }
                                    }}
                                    disabled={!runtime.available}
                                    className={`w-full text-left px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0 transition-colors ${
                                      !runtime.available
                                        ? 'opacity-50 cursor-not-allowed bg-neutral-50 dark:bg-neutral-900'
                                        : selectedRuntime === runtime.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                        selectedRuntime === runtime.id && runtimeStatus === 'connected'
                                          ? 'bg-green-500'
                                          : runtime.available
                                          ? 'bg-yellow-500'
                                          : 'bg-neutral-400'
                                      }`}></div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{runtime.name}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${accessLevelColors[runtime.accessLevel as keyof typeof accessLevelColors]}`}>
                                            {runtime.accessLevel}
                                          </span>
                                          {!runtime.available && (
                                            <span className="text-[9px] text-neutral-500">Offline</span>
                                          )}
                                        </div>

                                        <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">{runtime.image}</div>

                                        <div className="flex items-center gap-3 text-xs">
                                          <div className="flex items-center gap-1">
                                            <Cpu className={`w-3 h-3 ${runtime.available ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400'}`} />
                                            <span className="text-neutral-600 dark:text-neutral-400">{runtime.cpu}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Zap className={`w-3 h-3 ${runtime.available ? 'text-yellow-600 dark:text-yellow-400' : 'text-neutral-400'}`} />
                                            <span className="text-neutral-600 dark:text-neutral-400">{runtime.gpu}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Activity className={`w-3 h-3 ${runtime.available ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`} />
                                            <span className="text-neutral-600 dark:text-neutral-400">{runtime.memory}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <HardDrive className={`w-3 h-3 ${runtime.available ? 'text-purple-600 dark:text-purple-400' : 'text-neutral-400'}`} />
                                            <span className="text-neutral-600 dark:text-neutral-400">{runtime.storage}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* System Information */}
                      {runtimeStatus === 'connected' ? (
                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6 max-h-[50vh] overflow-y-auto">
                          {/* Basic System Info */}
                          <div className="mb-6">
                            <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wide">System Information</h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                                <div className="text-neutral-500 dark:text-neutral-400 mb-1">Hostname</div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">localhost:8888</div>
                              </div>
                              <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                                <div className="text-neutral-500 dark:text-neutral-400 mb-1">Platform</div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">Linux x86_64</div>
                              </div>
                              <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                                <div className="text-neutral-500 dark:text-neutral-400 mb-1">Kernel Version</div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">Python 3.11.5</div>
                              </div>
                              <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                                <div className="text-neutral-500 dark:text-neutral-400 mb-1">Uptime</div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">2h 34m</div>
                              </div>
                            </div>
                          </div>

                          {/* Resource Charts */}
                          <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-4 uppercase tracking-wide">Resource Usage</h4>
                          <div className="space-y-4">
                            {/* CPU */}
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">CPU Usage</div>
                                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Last 60 seconds</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">23%</div>
                                  <div className="text-[10px] text-green-600 dark:text-green-400">▲ 2%</div>
                                </div>
                              </div>
                              <svg className="w-full h-16" viewBox="0 0 300 60" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="cpuGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3"/>
                                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0"/>
                                  </linearGradient>
                                </defs>
                                <path d="M0,45 L25,40 L50,35 L75,30 L100,38 L125,32 L150,28 L175,35 L200,30 L225,25 L250,28 L275,30 L300,28"
                                      fill="url(#cpuGradient)" stroke="none"/>
                                <path d="M0,45 L25,40 L50,35 L75,30 L100,38 L125,32 L150,28 L175,35 L200,30 L225,25 L250,28 L275,30 L300,28"
                                      fill="none" stroke="rgb(59, 130, 246)" strokeWidth="2"/>
                              </svg>
                              <div className="flex justify-between text-[9px] text-neutral-400 dark:text-neutral-500 mt-1">
                                <span>60s ago</span>
                                <span>30s ago</span>
                                <span>now</span>
                              </div>
                            </div>

                            {/* RAM */}
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Memory Usage</div>
                                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400">4.2 / 16 GB</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">26%</div>
                                  <div className="text-[10px] text-red-600 dark:text-red-400">▼ 1%</div>
                                </div>
                              </div>
                              <svg className="w-full h-16" viewBox="0 0 300 60" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="ramGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3"/>
                                    <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0"/>
                                  </linearGradient>
                                </defs>
                                <path d="M0,40 L25,38 L50,35 L75,38 L100,33 L125,30 L150,28 L175,30 L200,28 L225,25 L250,27 L275,25 L300,23"
                                      fill="url(#ramGradient)" stroke="none"/>
                                <path d="M0,40 L25,38 L50,35 L75,38 L100,33 L125,30 L150,28 L175,30 L200,28 L225,25 L250,27 L275,25 L300,23"
                                      fill="none" stroke="rgb(34, 197, 94)" strokeWidth="2"/>
                              </svg>
                              <div className="flex justify-between text-[9px] text-neutral-400 dark:text-neutral-500 mt-1">
                                <span>60s ago</span>
                                <span>30s ago</span>
                                <span>now</span>
                              </div>
                            </div>

                            {/* Disk */}
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                    <HardDrive className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Disk Usage</div>
                                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400">128 / 512 GB</div>
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">25%</div>
                              </div>
                              <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300" style={{width: '25%'}}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                          <div className="text-center py-12 text-sm text-neutral-400 dark:text-neutral-500">
                            <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">Connect to a runtime to view system resources</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
        </>
      )}

      {/* Notebook cells */}
      <div className="flex-1 overflow-auto py-6">
      {/* Insert cell divider before first cell */}
      <div className="group/insert relative py-2">
        <div className="absolute inset-0 flex items-center opacity-0 group-hover/insert:opacity-100 transition-opacity z-10">
          <div className="flex-1 border-t border-neutral-300 dark:border-neutral-600 ml-[72px]"></div>
          <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 mx-2 shadow-sm">
            <button
              onClick={() => addCell(-1, 'code')}
              className="px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors flex items-center gap-1.5 group/btn"
            >
              <Code className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100">Code</span>
            </button>

            <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-600"></div>

            <button
              onClick={() => addCell(-1, 'markdown')}
              className="px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors flex items-center gap-1.5 group/btn"
            >
              <Type className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100">Markdown</span>
            </button>
          </div>
          <div className="flex-1 border-t border-neutral-300 dark:border-neutral-600 mr-4"></div>
        </div>
      </div>

      {cells.map((cell, index) => (
        <div key={cell.id} className="relative">
          {/* Cell content */}
          <div
            className="group relative"
            onClick={() => setSelectedCellId(cell.id)}
          >
          {/* Left side: Execution count */}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1 w-[65px]">
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                [{executingCells.has(cell.id) ? '*' : (cell.execution_count || ' ')}]
              </span>
            </div>
            {cell.executionStatus && (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span
                  className={`text-sm font-bold ${
                    cell.executionStatus === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                  title={cell.executionStatus === 'success' ? 'Executed successfully' : 'Execution error'}
                >
                  {cell.executionStatus === 'success' ? '✓' : '✕'}
                </span>
                {cell.executionTime !== undefined && (
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono whitespace-nowrap">
                    {(cell.executionTime / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cell content - takes up most space with minimal left/right padding */}
          <div className="ml-[72px] mr-4 relative overflow-visible">
            <div className={`border-2 rounded-md overflow-hidden transition-all shadow-sm bg-white dark:bg-transparent ${
              selectedCellId === cell.id
                ? 'border-blue-500 dark:border-blue-400 shadow-md'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
            }`}>
              {/* Play button - top left corner, always has space */}
              <button
                onClick={() => executeCell(cell.id)}
                className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-400 transition-colors opacity-0 group-hover:opacity-100 border border-neutral-300 dark:border-neutral-600 ${executingCells.has(cell.id) ? 'animate-spin opacity-100' : ''}`}
                title="Run cell (Shift+Enter)"
                disabled={executingCells.has(cell.id)}
              >
                <Play className="w-3 h-3 fill-current" />
              </button>

              {/* Floating toolbar - top right */}
              <div className="absolute -top-3 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg px-2 py-1">
                  {/* Cell Type Dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenCellTypeMenu(openCellTypeMenu === cell.id ? null : cell.id);
                      }}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"
                      title="Change cell type"
                    >
                      {cell.cell_type === 'code' ? <Code className="w-3.5 h-3.5" /> :
                       cell.cell_type === 'markdown' ? <Type className="w-3.5 h-3.5" /> :
                       <span className="text-xs font-mono">R</span>}
                    </button>

                    {/* Cell Type Dropdown Menu */}
                    {openCellTypeMenu === cell.id && (
                      <div className="absolute top-8 right-0 z-30 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            switchCellType(cell.id, 'code');
                            setOpenCellTypeMenu(null);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 ${
                            cell.cell_type === 'code' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <Code className="w-4 h-4" />
                          Code
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            switchCellType(cell.id, 'markdown');
                            setOpenCellTypeMenu(null);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 ${
                            cell.cell_type === 'markdown' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <Type className="w-4 h-4" />
                          Markdown
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            switchCellType(cell.id, 'raw');
                            setOpenCellTypeMenu(null);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 ${
                            cell.cell_type === 'raw' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <span className="w-4 h-4 flex items-center justify-center text-xs font-mono">R</span>
                          Raw
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600"></div>
                  <button
                    onClick={() => addCell(index)}
                    className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"
                    title="Add cell below"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600"></div>
                  <button
                    onClick={() => moveCell(cell.id, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveCell(cell.id, 'down')}
                    disabled={index === cells.length - 1}
                    className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600"></div>
                  <button
                    onClick={() => deleteCell(cell.id)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                    title="Delete cell"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Editor */}
              <div className="relative pl-14 pr-6 min-h-[32px] flex items-center">
                {cell.cell_type === 'markdown' && cell.isRendered ? (
                  <div
                    className="px-4 py-3 cursor-pointer markdown-content"
                    onClick={() => executeCell(cell.id)}
                  >
                    <ReactMarkdown>{Array.isArray(cell.source) ? cell.source.join('\n') : cell.source}</ReactMarkdown>
                  </div>
                ) : (
                  <Editor
                    key={`${cell.id}-${currentTheme}`}
                    height={`${Math.max(80, (Array.isArray(cell.source) ? cell.source.join('\n').split('\n').length : cell.source.split('\n').length) * 18 + 16)}px`}
                    language={cell.cell_type === 'markdown' ? 'markdown' : 'python'}
                    value={Array.isArray(cell.source) ? cell.source.join('\n') : cell.source}
                    onChange={(value) => updateCell(cell.id, value || '')}
                    beforeMount={(monaco) => {
                      if (!monacoRef.current) {
                        monacoRef.current = monaco;
                      }
                      // Define Monokai theme for dark mode
                      monaco.editor.defineTheme('monokai', {
                        base: 'vs-dark',
                        inherit: true,
                        rules: [
                          { token: 'comment', foreground: '75715E' },
                          { token: 'string', foreground: 'E6DB74' },
                          { token: 'keyword', foreground: 'F92672' },
                          { token: 'number', foreground: 'AE81FF' },
                          { token: 'regexp', foreground: 'AE81FF' },
                          { token: 'type', foreground: '66D9EF' },
                          { token: 'class', foreground: 'A6E22E' },
                          { token: 'function', foreground: 'A6E22E' },
                          { token: 'variable', foreground: 'F8F8F2' },
                          { token: 'constant', foreground: 'AE81FF' },
                          { token: 'operator', foreground: 'F92672' },
                        ],
                        colors: {
                          'editor.foreground': '#F8F8F2',
                          'editorLineNumber.foreground': '#90908A',
                        }
                      });

                      // Define light theme
                      monaco.editor.defineTheme('light-plus', {
                        base: 'vs',
                        inherit: true,
                        rules: [
                          { token: 'comment', foreground: '6A9955' },
                          { token: 'string', foreground: 'A31515' },
                          { token: 'keyword', foreground: '0000FF' },
                          { token: 'number', foreground: '098658' },
                        ],
                        colors: {
                          'editor.foreground': '#000000',
                          'editorLineNumber.foreground': '#237893',
                        }
                      });
                    }}
                    onMount={(editor, monaco) => {
                      // Store editor ref for this cell
                      editorRefsMap.current.set(cell.id, editor);

                      // Set monaco ref if not set
                      if (!monacoRef.current) {
                        monacoRef.current = monaco;
                      }

                      // If this is the first cell, set it as active for collaboration
                      const cellIndex = cells.findIndex(c => c.id === cell.id);
                      const isFirstCell = cellIndex === 0;
                      console.log('[NotebookEditor] Cell mounted:', { cellId: cell.id, cellIndex, isFirstCell });

                      if (isFirstCell) {
                        console.log('[NotebookEditor] Setting first cell as active:', cell.id);
                        activeCellEditorRef.current = editor;
                        activeCellIdRef.current = cell.id;
                      }

                      // When this cell gets focus, make it the active editor for collaboration
                      editor.onDidFocusEditorText(() => {
                        console.log('[NotebookEditor] Cell focused:', cell.id);
                        activeCellEditorRef.current = editor;
                        activeCellIdRef.current = cell.id;
                        setSelectedCellId(cell.id);
                      });

                      // Note: We don't need a blur handler - just switching focus to the next cell is enough
                      // Blur events were causing cursor clear broadcasts between cell switches

                      // Set initial theme
                      const initialTheme = currentTheme === 'dark' ? 'monokai' : 'light-plus';
                      monaco.editor.setTheme(initialTheme);
                    }}
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: 'off',
                      glyphMargin: false,
                      folding: false,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 0,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      padding: { top: 4, bottom: 4 },
                      fontSize: 13,
                      lineHeight: 18,
                      automaticLayout: true,
                      scrollbar: {
                        vertical: 'hidden',
                        horizontal: 'hidden'
                      },
                      renderLineHighlight: 'none'
                    }}
                    theme={currentTheme === 'dark' ? 'monokai' : 'light-plus'}
                  />
                )}
                {executingCells.has(cell.id) && (
                  <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Cell Output */}
              {cell.outputs && cell.outputs.length > 0 && (
                <div className="border-t border-neutral-200 dark:border-neutral-700">
                  {/* Collapse/Expand button */}
                  <button
                    onClick={() => {
                      const newCollapsed = new Set(collapsedOutputs);
                      if (newCollapsed.has(cell.id)) {
                        newCollapsed.delete(cell.id);
                      } else {
                        newCollapsed.add(cell.id);
                      }
                      setCollapsedOutputs(newCollapsed);
                    }}
                    className="w-full px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedOutputs.has(cell.id) ? '-rotate-90' : ''}`} />
                      Output ({cell.outputs.length})
                    </span>
                  </button>

                  {!collapsedOutputs.has(cell.id) && cell.outputs.map((output, idx) => {
                    const outputId = `${cell.id}-output-${idx}`;
                    return (
                    <div key={idx} className="px-4 py-2 relative group/output">
                      {/* Three-dot menu button */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover/output:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenOutputMenu(openOutputMenu === outputId ? null : outputId);
                          }}
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
                          title="Output options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown menu */}
                        {openOutputMenu === outputId && (
                          <div className="absolute right-0 top-8 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Copy output to clipboard
                                const textContent = output.output_type === 'stream'
                                  ? (Array.isArray(output.text) ? output.text.join('') : (output.text || ''))
                                  : output.output_type === 'execute_result'
                                  ? (output.data?.['text/plain']
                                      ? (Array.isArray(output.data['text/plain']) ? output.data['text/plain'].join('') : String(output.data['text/plain']))
                                      : '')
                                  : '';
                                navigator.clipboard.writeText(String(textContent));
                                setOpenOutputMenu(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                            >
                              <Copy className="w-4 h-4" />
                              Copy output
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement fullscreen view
                                setOpenOutputMenu(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                            >
                              <Maximize2 className="w-4 h-4" />
                              View fullscreen
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Clear this specific output
                                const updatedCells = cells.map(c => {
                                  if (c.id === cell.id && c.outputs) {
                                    return {
                                      ...c,
                                      outputs: c.outputs.filter((_, i) => i !== idx)
                                    };
                                  }
                                  return c;
                                });
                                setCells(updatedCells);
                                setOpenOutputMenu(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                              Clear output
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Stream output (print statements, logs) */}
                      {output.output_type === 'stream' && (
                        <div className={output.name === 'stderr' ? 'text-red-600 dark:text-red-400' : ''}>
                          <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-800 dark:text-neutral-200 m-0">
                            {Array.isArray(output.text) ? output.text.join('') : output.text}
                          </pre>
                        </div>
                      )}

                      {/* Execute result (return values, expressions) */}
                      {output.output_type === 'execute_result' && output.data && (
                        <div className="flex gap-3">
                          {/* Execution count badge */}
                          <div className="text-red-600 dark:text-red-400 font-mono text-sm flex-shrink-0">
                            Out[{output.execution_count}]:
                          </div>
                          <div className="flex-1">
                            {output.data['text/html'] ? (
                              <div
                                className="jupyter-html-output max-w-full overflow-auto"
                                dangerouslySetInnerHTML={{
                                  __html: Array.isArray(output.data['text/html'])
                                    ? output.data['text/html'].join('')
                                    : String(output.data['text/html'])
                                }}
                              />
                            ) : null}
                            {output.data['image/png'] ? (
                              <img
                                src={`data:image/png;base64,${output.data['image/png']}`}
                                alt="Output"
                                className="max-w-full h-auto"
                              />
                            ) : null}
                            {output.data['image/jpeg'] ? (
                              <img
                                src={`data:image/jpeg;base64,${output.data['image/jpeg']}`}
                                alt="Output"
                                className="max-w-full h-auto"
                              />
                            ) : null}
                            {output.data['image/svg+xml'] ? (
                              <div dangerouslySetInnerHTML={{
                                __html: Array.isArray(output.data['image/svg+xml'])
                                  ? output.data['image/svg+xml'].join('')
                                  : String(output.data['image/svg+xml'])
                              }} />
                            ) : null}
                            {output.data['text/plain'] && !output.data['text/html'] && !output.data['image/png'] && !output.data['image/jpeg'] ? (
                              <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-800 dark:text-neutral-200 m-0">
                                {Array.isArray(output.data['text/plain'])
                                  ? output.data['text/plain'].join('')
                                  : String(output.data['text/plain'])}
                              </pre>
                            ) : null}
                            {output.data['text/latex'] ? (
                              <div className="text-neutral-800 dark:text-neutral-200">
                                {Array.isArray(output.data['text/latex'])
                                  ? output.data['text/latex'].join('')
                                  : String(output.data['text/latex'])}
                              </div>
                            ) : null}
                            {output.data['application/json'] ? (
                              <pre className="whitespace-pre-wrap font-mono text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-neutral-800 dark:text-neutral-200">
                                {JSON.stringify(output.data['application/json'], null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Display data (plots, widgets, rich displays) */}
                      {output.output_type === 'display_data' && output.data && (
                        <div className="my-2">
                          {output.data['text/html'] ? (
                            <div
                              className="jupyter-html-output max-w-full overflow-auto"
                              dangerouslySetInnerHTML={{
                                __html: Array.isArray(output.data['text/html'])
                                  ? output.data['text/html'].join('')
                                  : String(output.data['text/html'])
                              }}
                            />
                          ) : null}
                          {output.data['image/png'] ? (
                            <img
                              src={`data:image/png;base64,${output.data['image/png']}`}
                              alt="Plot"
                              className="max-w-full h-auto"
                            />
                          ) : null}
                          {output.data['image/jpeg'] ? (
                            <img
                              src={`data:image/jpeg;base64,${output.data['image/jpeg']}`}
                              alt="Plot"
                              className="max-w-full h-auto"
                            />
                          ) : null}
                          {output.data['image/svg+xml'] ? (
                            <div dangerouslySetInnerHTML={{
                              __html: Array.isArray(output.data['image/svg+xml'])
                                ? output.data['image/svg+xml'].join('')
                                : String(output.data['image/svg+xml'])
                            }} />
                          ) : null}
                          {output.data['text/plain'] && !output.data['text/html'] && !output.data['image/png'] ? (
                            <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-800 dark:text-neutral-200 m-0">
                              {Array.isArray(output.data['text/plain'])
                                ? output.data['text/plain'].join('')
                                : String(output.data['text/plain'])}
                            </pre>
                          ) : null}
                        </div>
                      )}

                      {/* Error output (exceptions, tracebacks) */}
                      {output.output_type === 'error' && (
                        <div className="bg-red-50 dark:bg-red-950 border-l-4 border-red-500 p-3 my-2">
                          <div className="font-bold text-red-700 dark:text-red-400 mb-2">
                            {output.ename}: {output.evalue}
                          </div>
                          <pre className="whitespace-pre-wrap font-mono text-xs text-red-700 dark:text-red-300 overflow-x-auto">
                            {output.traceback ? output.traceback.map((line: string) =>
                              line.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
                            ).join('\n') : ''}
                          </pre>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insert cell divider - appears between cells on hover */}
        <div className="group/insert relative py-2">
          <div className="absolute inset-0 flex items-center opacity-0 group-hover/insert:opacity-100 transition-opacity z-10">
            <div className="flex-1 border-t border-neutral-300 dark:border-neutral-600 ml-[72px]"></div>
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 mx-2 shadow-sm">
              <button
                onClick={() => addCell(index, 'code')}
                className="px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors flex items-center gap-1.5 group/btn"
              >
                <Code className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100">Code</span>
              </button>

              <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-600"></div>

              <button
                onClick={() => addCell(index, 'markdown')}
                className="px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors flex items-center gap-1.5 group/btn"
              >
                <Type className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover/btn:text-neutral-900 dark:group-hover/btn:text-neutral-100">Markdown</span>
              </button>
            </div>
            <div className="flex-1 border-t border-neutral-300 dark:border-neutral-600 mr-16"></div>
          </div>
        </div>
        </div>
      ))}
      </div>
    </div>
  );
}
