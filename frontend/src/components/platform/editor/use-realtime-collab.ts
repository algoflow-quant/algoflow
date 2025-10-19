'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface CollabUser {
  id: string
  name: string
  color: string
  avatarUrl?: string
  cursor?: { line: number; column: number }
  cellId?: string // For notebook cells
  sessionId?: string // Track which session this cursor belongs to
  lastActive?: number // Timestamp of last activity
}

interface UseRealtimeCollabProps {
  projectId: string
  fileName: string
  editor: import('monaco-editor').editor.IStandaloneCodeEditor | null
  monaco: typeof import('monaco-editor') | null
  cellId?: string // Optional: for notebook cells
  editorRefsMap?: Map<string, import('monaco-editor').editor.IStandaloneCodeEditor> // Optional: map of all cell editors for notebooks
  onCellAdded?: (index: number) => void // Callback when a cell is added remotely
  onCellDeleted?: (cellId: string) => void // Callback when a cell is deleted remotely
  onCellContentChanged?: (cellId: string, content: string) => void // Callback when cell content changes remotely
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

export function useRealtimeCollab({ projectId, fileName, editor, monaco, cellId, editorRefsMap, onCellAdded, onCellDeleted, onCellContentChanged }: UseRealtimeCollabProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [activeUsers, setActiveUsers] = useState<CollabUser[]>([])
  const [channelReady, setChannelReady] = useState(false)
  const [myColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)])
  const [sessionId] = useState(() => `${Date.now()}-${Math.random()}`) // Unique ID per tab/session
  const widgetsRef = useRef<import('monaco-editor').editor.IContentWidget[]>([])
  const suppressNextChangeRef = useRef(false)
  const suppressNextChangePerCell = useRef<Map<string, boolean>>(new Map())
  const suppressCellChangesRef = useRef<Set<string>>(new Set()) // Track which cells should suppress next change
  const pendingRemoteChanges = useRef<Map<string, unknown[]>>(new Map()) // Queue remote changes per cell/editor
  const isApplyingRemoteChanges = useRef<Set<string>>(new Set()) // Track if we're applying remote changes
  const myIdRef = useRef<string>('')
  const userNameRef = useRef<string>('User')
  const avatarUrlRef = useRef<string | undefined>(undefined)
  const cellIdRef = useRef<string | undefined>(cellId)
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(editor)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(monaco)

  // Update refs synchronously during render (not in useEffect)
  cellIdRef.current = cellId
  editorRef.current = editor
  monacoRef.current = monaco

  // Setup channel (persistent across editor changes)
  useEffect(() => {
    console.log('[Collab] Setup effect called:', { projectId, fileName })
    if (!projectId || !fileName) {
      console.log('[Collab] Missing projectId or fileName, skipping setup')
      return
    }
    if (typeof window === 'undefined') return

    const supabase = createClient()
    const roomName = `collab:${projectId}:${fileName}`
    console.log('[Collab] Creating channel:', roomName)

    const setupChannel = async () => {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      myIdRef.current = user.id

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      userNameRef.current = profile?.name || 'Unknown User'
      avatarUrlRef.current = profile?.avatar_url || undefined

      const channel = supabase.channel(roomName, {
        config: { broadcast: { self: false } } // Don't receive our own broadcasts
      })

      channelRef.current = channel

      // Receive changes from others
      channel
        .on('broadcast', { event: 'change' }, ({ payload }) => {
          // Ignore our own text changes (same session)
          if (payload.sessionId === sessionId) {
            console.log('[Collab] Ignoring own text change broadcast')
            return
          }

          console.log('[Collab] Received text change:', payload)

          // For notebooks - apply to the specific cell editor
          if (payload.cellId && editorRefsMap && editorRefsMap.size > 0) {
            console.log('[Collab] Queueing text change for notebook cell:', payload.cellId)
            const cellEditor = editorRefsMap.get(payload.cellId)
            const currentMonaco = monacoRef.current

            if (!cellEditor || !currentMonaco) {
              console.log('[Collab] Cell editor not found for:', payload.cellId)
              return
            }

            // Queue the change instead of applying immediately
            const queueKey = `cell-${payload.cellId}`
            if (!pendingRemoteChanges.current.has(queueKey)) {
              pendingRemoteChanges.current.set(queueKey, [])
            }
            pendingRemoteChanges.current.get(queueKey)!.push(payload)

            // Apply queued changes with a small delay to batch them
            setTimeout(() => {
              const changes = pendingRemoteChanges.current.get(queueKey)
              if (!changes || changes.length === 0) return

              // Clear the queue
              pendingRemoteChanges.current.set(queueKey, [])

              // Check if we're currently typing - if so, delay application
              if (isApplyingRemoteChanges.current.has(queueKey)) {
                return
              }

              // Mark that we're applying changes
              isApplyingRemoteChanges.current.add(queueKey)
              suppressNextChangePerCell.current.set(payload.cellId, true)

              // Save selection and position
              const selection = cellEditor.getSelection()
              const position = cellEditor.getPosition()

              // Apply all queued changes
              const edits = changes.map(change => ({
                range: new currentMonaco.Range(
                  change.range.startLineNumber,
                  change.range.startColumn,
                  change.range.endLineNumber,
                  change.range.endColumn
                ),
                text: change.text,
                forceMoveMarkers: false
              }))

              // Use pushEditOperations to maintain undo stack and cursor
              cellEditor.getModel()?.pushEditOperations(
                [],
                edits,
                () => null
              )

              // Restore position if we're in the same cell
              if (position && cellIdRef.current === payload.cellId) {
                cellEditor.setPosition(position)
                if (selection) {
                  cellEditor.setSelection(selection)
                }
              }

              // Clean up
              setTimeout(() => {
                isApplyingRemoteChanges.current.delete(queueKey)
                suppressNextChangePerCell.current.delete(payload.cellId)
              }, 50)
            }, 16) // Wait one frame (16ms) to batch changes

            return
          }

          // For regular files, apply to the active editor
          const currentEditor = editorRef.current
          const currentMonaco = monacoRef.current
          if (!currentEditor || !currentMonaco) return

          suppressNextChangeRef.current = true
          currentEditor.executeEdits('remote', [{
            range: new currentMonaco.Range(
              payload.range.startLineNumber,
              payload.range.startColumn,
              payload.range.endLineNumber,
              payload.range.endColumn
            ),
            text: payload.text,
            forceMoveMarkers: true
          }])
        })
        .on('broadcast', { event: 'cursor' }, ({ payload }) => {
          const myCellId = cellIdRef.current

          // Ignore our own cursor broadcasts (same session)
          if (payload.sessionId === sessionId) {
            console.log('[Collab] Ignoring own cursor broadcast')
            return
          }

          console.log('[Collab] Received cursor update:', {
            payload,
            myCellId,
            payloadCellId: payload.cellId
          })

          setActiveUsers(prev => {
            // Filter out all cursors from this user (all sessions)
            const filtered = prev.filter(u => u.id !== payload.userId)

            if (!payload.cursor) {
              // User cleared their cursor (left the editor)
              console.log('[Collab] User cleared cursor, removing')
              return filtered
            }

            const newUser = {
              id: payload.userId,
              name: payload.userName || `User ${payload.userId.substr(0, 4)}`,
              color: payload.color,
              avatarUrl: payload.avatarUrl,
              cursor: payload.cursor,
              cellId: payload.cellId,
              sessionId: payload.sessionId,
              lastActive: Date.now()
            }

            // Add the new cursor from this session
            // This automatically replaces any previous cursor from the same user
            console.log('[Collab] Updated active users:', [...filtered, newUser])
            return [...filtered, newUser]
          })
        })
        .on('broadcast', { event: 'cell-added' }, ({ payload }) => {
          // Ignore our own cell operations (same session)
          if (payload.sessionId === sessionId) {
            console.log('[Collab] Ignoring own cell-added broadcast')
            return
          }

          console.log('[Collab] Received cell-added:', payload)
          if (onCellAdded && typeof payload.index === 'number') {
            onCellAdded(payload.index)
          }
        })
        .on('broadcast', { event: 'cell-deleted' }, ({ payload }) => {
          // Ignore our own cell operations (same session)
          if (payload.sessionId === sessionId) {
            console.log('[Collab] Ignoring own cell-deleted broadcast')
            return
          }

          console.log('[Collab] Received cell-deleted:', payload)
          if (onCellDeleted && payload.cellId) {
            onCellDeleted(payload.cellId)
          }
        })
        .subscribe((status) => {
          console.log('[Collab] Channel subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('[Collab] Successfully subscribed to room:', roomName)
            setChannelReady(true)
          }
        })
    }

    setupChannel()

    return () => {
      setChannelReady(false)
      // IMPORTANT: Clear active users when switching channels/files
      setActiveUsers([])

      if (channelRef.current) {
        // Send a cursor clear event before unsubscribing
        console.log('[Collab] Sending cursor clear before cleanup')
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            sessionId: sessionId,
            userId: myIdRef.current,
            userName: userNameRef.current,
            avatarUrl: avatarUrlRef.current,
            color: myColor,
            cursor: null, // null cursor means remove it
            cellId: null
          }
        })

        // Give the message time to send before unsubscribing
        setTimeout(() => {
          if (channelRef.current) {
            channelRef.current.unsubscribe()
            channelRef.current = null
          }
        }, 50)
      }
    }
  }, [projectId, fileName, myColor])

  // Clean up inactive users periodically (in case cleanup messages were missed)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const now = Date.now()
        const INACTIVE_TIMEOUT = 30000 // 30 seconds
        return prev.filter(user => {
          // Keep users that were active recently
          return user.lastActive && (now - user.lastActive) < INACTIVE_TIMEOUT
        })
      })
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Setup editor listeners (updates when editor changes)
  useEffect(() => {
    const channel = channelRef.current
    const currentEditor = editorRef.current
    const currentMonaco = monacoRef.current

    console.log('[Collab] Editor listeners effect triggered - DETAILED:', {
      'editor === null': editor === null,
      'monaco === null': monaco === null,
      'editorRef': !!currentEditor,
      'monacoRef': !!currentMonaco,
      'channel exists': !!channel,
      channelReady,
      cellId: cellIdRef.current
    })

    // Wait for channel creation and editor/monaco to be ready
    if (!currentEditor || !currentMonaco || !channel) {
      console.log('[Collab] SKIPPING - editorRef:', !!currentEditor, 'monacoRef:', !!currentMonaco, 'channel:', !!channel, 'channelReady:', channelReady)
      return
    }

    console.log('[Collab] Proceeding with editor listener setup')

    let changeListener: import('monaco-editor').IDisposable | null = null
    let cursorListener: import('monaco-editor').IDisposable | null = null
    let blurListener: import('monaco-editor').IDisposable | null = null
    let focusListener: import('monaco-editor').IDisposable | null = null

    const setupEditorListeners = () => {
      const channel = channelRef.current

      // For notebooks with multiple cells, set up listeners for all cell editors
      if (editorRefsMap && editorRefsMap.size > 0 && channel) {
        console.log('[Collab] Setting up listeners for notebook cells:', editorRefsMap.size)

        // Store all listeners so we can clean them up later
        const allListeners: Array<{ dispose: () => void }> = []

        editorRefsMap.forEach((cellEditor, cellId) => {
          console.log('[Collab] Setting up listeners for cell:', cellId)

          // Helper function to send cursor update for this cell
          const updateCellCursor = () => {
            const position = cellEditor.getPosition()
            if (position && channel) {
              console.log('[Collab] Sending cursor update for cell:', cellId, position)
              channel.send({
                type: 'broadcast',
                event: 'cursor',
                payload: {
                  sessionId: sessionId,
                  userId: myIdRef.current,
                  userName: userNameRef.current,
                  avatarUrl: avatarUrlRef.current,
                  color: myColor,
                  cursor: { line: position.lineNumber, column: position.column },
                  cellId: cellId
                }
              })
            }
          }

          // Listen for text changes
          const cellChangeListener = cellEditor.onDidChangeModelContent((e) => {
            const queueKey = `cell-${cellId}`

            // Check if we should suppress this change (it came from remote)
            if (suppressNextChangePerCell.current.get(cellId)) {
              // Don't delete the flag here - let the timeout handle it
              return
            }

            // If we're applying remote changes, don't broadcast
            if (isApplyingRemoteChanges.current.has(queueKey)) {
              return
            }

            // Mark that we're locally editing
            isApplyingRemoteChanges.current.add(queueKey)
            setTimeout(() => {
              isApplyingRemoteChanges.current.delete(queueKey)
            }, 100) // Mark as typing for 100ms

            // Broadcast the change with the cell ID
            e.changes.forEach((change) => {
              console.log('[Collab] Broadcasting cell change:', { cellId, change })
              if (channel) {
                channel.send({
                  type: 'broadcast',
                  event: 'change',
                  payload: {
                    sessionId: sessionId,
                    userId: myIdRef.current,
                    cellId: cellId,
                    range: {
                      startLineNumber: change.range.startLineNumber,
                      startColumn: change.range.startColumn,
                      endLineNumber: change.range.endLineNumber,
                      endColumn: change.range.endColumn
                    },
                    text: change.text
                  }
                })
              }
            })

            // Don't update cursor immediately after typing to avoid conflicts
            // The cursor position will be updated by the cursor listener
          })

          // Throttle cursor updates to prevent flooding
          let cursorUpdateTimeout: NodeJS.Timeout | null = null
          const throttledUpdateCursor = () => {
            if (cursorUpdateTimeout) {
              clearTimeout(cursorUpdateTimeout)
            }
            cursorUpdateTimeout = setTimeout(() => {
              updateCellCursor()
            }, 50) // 50ms throttle
          }

          // Listen for cursor position changes
          const cellCursorListener = cellEditor.onDidChangeCursorPosition(() => {
            throttledUpdateCursor()
          })

          // Listen for focus events
          const cellFocusListener = cellEditor.onDidFocusEditorText(() => {
            console.log('[Collab] Cell editor focused:', cellId)
            updateCellCursor()
          })

          allListeners.push(cellChangeListener)
          allListeners.push(cellCursorListener)
          allListeners.push(cellFocusListener)
        })

        // Store listeners for cleanup
        changeListener = { dispose: () => allListeners.forEach(l => l.dispose()) }
        return
      }

      // For regular files, use the single editor
      if (!channel || !currentEditor) {
        console.log('[Collab] Cannot setup editor listeners - no channel or editor')
        return
      }

      const myId = myIdRef.current
      console.log('[Collab] Setting up editor listeners for:', { myId, cellId: cellIdRef.current })

      // Track cursor position
      const updateMyCursor = () => {
        const position = currentEditor.getPosition()
        if (position && channel) {
          console.log('[Collab] Sending cursor update:', { line: position.lineNumber, column: position.column, cellId: cellIdRef.current })
          channel.send({
            type: 'broadcast',
            event: 'cursor',
            payload: {
              sessionId: sessionId,
              userId: myId,
              userName: userNameRef.current,
              avatarUrl: avatarUrlRef.current,
              color: myColor,
              cursor: { line: position.lineNumber, column: position.column },
              cellId: cellIdRef.current
            }
          })
        }
      }

      // Listen for text changes
      changeListener = currentEditor.onDidChangeModelContent((e) => {
        if (suppressNextChangeRef.current) {
          suppressNextChangeRef.current = false
          return
        }

        // Broadcast the change
        e.changes.forEach((change) => {
          channel.send({
            type: 'broadcast',
            event: 'change',
            payload: {
              sessionId: sessionId,
              userId: myId,
              cellId: cellIdRef.current,
              range: {
                startLineNumber: change.range.startLineNumber,
                startColumn: change.range.startColumn,
                endLineNumber: change.range.endLineNumber,
                endColumn: change.range.endColumn
              },
              text: change.text
            }
          })
        })

        updateMyCursor()
      })

      // Listen for cursor position changes
      cursorListener = currentEditor.onDidChangeCursorPosition(() => {
        updateMyCursor()
      })

      // Listen for editor blur
      blurListener = currentEditor.onDidBlurEditorText(() => {
        // For notebooks, don't clear cursor on blur - we want to keep showing position
        // even when switching between cells. For regular files, clear cursor when leaving.
        if (!cellIdRef.current) {
          console.log('[Collab] Editor blurred, sending empty cursor')
          channel.send({
            type: 'broadcast',
            event: 'cursor',
            payload: {
              sessionId: sessionId,
              userId: myId,
              userName: userNameRef.current,
              color: myColor,
              cursor: null,
              cellId: cellIdRef.current
            }
          })
        } else {
          console.log('[Collab] Notebook cell blurred, keeping cursor visible')
        }
      })

      // Listen for editor focus
      focusListener = currentEditor.onDidFocusEditorText(() => {
        console.log('[Collab] Editor focused, sending cursor position')
        updateMyCursor()
      })

      // Send initial cursor position
      updateMyCursor()
    }

    setupEditorListeners()

    return () => {
      // Send cursor clear when disposing editor listeners
      const channel = channelRef.current
      if (channel && myIdRef.current) {
        console.log('[Collab] Clearing cursor on editor dispose')
        channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            sessionId: sessionId,
            userId: myIdRef.current,
            userName: userNameRef.current,
            avatarUrl: avatarUrlRef.current,
            color: myColor,
            cursor: null,
            cellId: cellIdRef.current
          }
        })
      }

      if (changeListener) changeListener.dispose()
      if (cursorListener) cursorListener.dispose()
      if (blurListener) blurListener.dispose()
      if (focusListener) focusListener.dispose()
    }
  }, [editor, monaco, myColor, sessionId, channelReady])

  // Render cursor widgets
  useEffect(() => {
    const currentMonaco = monacoRef.current

    console.log('[Collab] Cursor widget effect triggered:', {
      hasMonaco: !!currentMonaco,
      activeUsersCount: activeUsers.length,
      hasEditorRefsMap: !!editorRefsMap,
      editorRefsMapSize: editorRefsMap?.size || 0,
      activeUsersData: activeUsers.map(u => ({ name: u.name, cellId: u.cellId, cursor: u.cursor }))
    })

    if (!currentMonaco) {
      console.log('[Collab] Skipping cursor widget render - no monaco')
      return
    }

    // For notebooks with multiple cells, render cursors in the correct cell editor
    if (editorRefsMap && editorRefsMap.size > 0) {
      console.log('[Collab] Rendering cursor widgets in notebook cells')

      // Remove old widgets from all editors
      widgetsRef.current.forEach(widget => {
        editorRefsMap.forEach(editor => {
          try {
            editor.removeContentWidget(widget)
          } catch (e) {
            // Widget might not be in this editor, ignore
          }
        })
      })
      widgetsRef.current = []

      // Create new widgets for each user in their respective cell
      activeUsers.forEach(user => {
        if (!user.cursor || !user.cellId) return

        const cellEditor = editorRefsMap.get(user.cellId)
        if (!cellEditor) {
          console.log('[Collab] No editor found for cell:', user.cellId)
          return
        }

        const widgetId = `remote-cursor-${user.id}`

        const cursorWidget = {
          getId: () => widgetId,
          getDomNode: () => {
            const node = document.createElement('div')
            node.className = 'remote-cursor-widget'
            node.id = widgetId
            node.style.cssText = 'pointer-events: none; z-index: 99999; position: relative;'

            node.innerHTML = `
              <div style="
                width: 2px;
                height: 20px;
                background: ${user.color};
                animation: blink 1s infinite;
                position: relative;
              "></div>
            `
            return node
          },
          getPosition: () => {
            if (!user.cursor) return null
            return {
              position: {
                lineNumber: user.cursor.line,
                column: user.cursor.column
              },
              preference: [
                currentMonaco.editor.ContentWidgetPositionPreference.EXACT
              ]
            }
          }
        }

        cellEditor.addContentWidget(cursorWidget)
        widgetsRef.current.push(cursorWidget)
        console.log('[Collab] Added cursor widget for:', user.name, 'in cell:', user.cellId)

        // Create floating label that renders outside Monaco's containers
        const labelId = `label-${widgetId}`
        let labelElement = document.getElementById(labelId) as HTMLDivElement | null

        if (!labelElement) {
          labelElement = document.createElement('div')
          labelElement.id = labelId
          labelElement.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 4px;
            background: ${user.color};
            color: white;
            padding: 2px 6px 2px 2px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            max-width: 150px;
          `

          const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          const avatarHtml = user.avatarUrl
            ? `<img src="${user.avatarUrl}" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;" />`
            : `<div style="width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 600;">${initials}</div>`

          labelElement.innerHTML = `
            ${avatarHtml}
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.name}</span>
          `
          document.body.appendChild(labelElement)
        }

        // Position label above cursor
        const cursorDom = document.getElementById(widgetId)
        if (cursorDom) {
          const updateLabelPosition = () => {
            const rect = cursorDom.getBoundingClientRect()
            if (labelElement) {
              labelElement.style.left = `${rect.left + 4}px`
              labelElement.style.top = `${rect.top - 26}px`
            }
          }
          updateLabelPosition()

          // Update position on scroll/resize
          const observer = new MutationObserver(updateLabelPosition)
          observer.observe(cursorDom, { attributes: true, childList: true, subtree: true })
        }
      })
    } else {
      // Regular file - render in single editor
      const currentEditor = editorRef.current
      if (!currentEditor) {
        console.log('[Collab] Skipping cursor widget render - no editor')
        return
      }

      console.log('[Collab] Rendering cursor widgets for all users:', activeUsers)

      // Remove old widgets
      widgetsRef.current.forEach(widget => {
        currentEditor.removeContentWidget(widget)
      })
      widgetsRef.current = []

      // Create new widgets for each user
      activeUsers.forEach(user => {
        if (!user.cursor) return

        const widgetId = `remote-cursor-${user.id}`

      const cursorWidget = {
        getId: () => widgetId,
        getDomNode: () => {
          const node = document.createElement('div')
          node.className = 'remote-cursor-widget'
          node.id = widgetId
          node.style.cssText = 'pointer-events: none; z-index: 99999; position: relative;'

          node.innerHTML = `
            <div style="
              width: 2px;
              height: 20px;
              background: ${user.color};
              animation: blink 1s infinite;
              position: relative;
            "></div>
          `
          return node
        },
        getPosition: () => {
          if (!user.cursor) return null
          return {
            position: {
              lineNumber: user.cursor.line,
              column: user.cursor.column
            },
            preference: [
              currentMonaco.editor.ContentWidgetPositionPreference.EXACT
            ]
          }
        }
      }

        currentEditor.addContentWidget(cursorWidget)
        widgetsRef.current.push(cursorWidget)
        console.log('[Collab] Added cursor widget for:', user.name)

        // Create floating label that renders outside Monaco's containers
        const labelId = `label-${widgetId}`
        let labelElement = document.getElementById(labelId) as HTMLDivElement | null

        if (!labelElement) {
          labelElement = document.createElement('div')
          labelElement.id = labelId
          labelElement.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 4px;
            background: ${user.color};
            color: white;
            padding: 2px 6px 2px 2px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            max-width: 150px;
          `

          const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          const avatarHtml = user.avatarUrl
            ? `<img src="${user.avatarUrl}" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;" />`
            : `<div style="width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 600;">${initials}</div>`

          labelElement.innerHTML = `
            ${avatarHtml}
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.name}</span>
          `
          document.body.appendChild(labelElement)
        }

        // Position label above cursor
        const cursorDom = document.getElementById(widgetId)
        if (cursorDom) {
          const updateLabelPosition = () => {
            const rect = cursorDom.getBoundingClientRect()
            if (labelElement) {
              labelElement.style.left = `${rect.left + 4}px`
              labelElement.style.top = `${rect.top - 26}px`
            }
          }
          updateLabelPosition()

          // Update position on scroll/resize
          const observer = new MutationObserver(updateLabelPosition)
          observer.observe(cursorDom, { attributes: true, childList: true, subtree: true })
        }
      })
    }

    // Add blinking animation
    const existingStyle = document.getElementById('remote-cursor-styles')
    if (existingStyle) {
      existingStyle.remove()
    }

    const style = document.createElement('style')
    style.id = 'remote-cursor-styles'
    style.innerHTML = `
      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }

      .remote-cursor-widget {
        z-index: 999999 !important;
        position: relative !important;
      }

      .monaco-editor .overflow-guard,
      .monaco-editor .lines-content,
      .monaco-editor .view-lines {
        overflow: visible !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      // Clean up widgets from all editors
      if (editorRefsMap && editorRefsMap.size > 0) {
        widgetsRef.current.forEach(widget => {
          editorRefsMap.forEach(editor => {
            try {
              editor.removeContentWidget(widget)
            } catch (e) {
              // Widget might not be in this editor, ignore
            }
          })
        })
      } else {
        widgetsRef.current.forEach(widget => {
          const currentEditor = editorRef.current
          if (currentEditor) {
            currentEditor.removeContentWidget(widget)
          }
        })
      }
      widgetsRef.current = []

      // Clean up cursor label elements from the DOM
      document.querySelectorAll('[id^="remote-cursor-label-"]').forEach(label => {
        label.remove()
      })
    }
  }, [activeUsers])

  // Broadcast cell operations
  const broadcastCellAdded = (index: number) => {
    const channel = channelRef.current
    if (!channel) return

    console.log('[Collab] Broadcasting cell-added:', { index })
    channel.send({
      type: 'broadcast',
      event: 'cell-added',
      payload: {
        sessionId,
        index
      }
    })
  }

  const broadcastCellDeleted = (cellId: string) => {
    const channel = channelRef.current
    if (!channel) return

    console.log('[Collab] Broadcasting cell-deleted:', { cellId })
    channel.send({
      type: 'broadcast',
      event: 'cell-deleted',
      payload: {
        sessionId,
        cellId
      }
    })
  }

  return {
    activeUsers,
    myColor,
    broadcastCellAdded,
    broadcastCellDeleted
  }
}
