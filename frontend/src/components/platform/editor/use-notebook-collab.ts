'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface CollabUser {
  id: string
  name: string
  color: string
  cellId: string
  cursor?: { line: number; column: number }
}

interface UseNotebookCollabProps {
  projectId: string
  fileName: string
  cellId: string
  editor: import('monaco-editor').editor.IStandaloneCodeEditor | null
  monaco: typeof import('monaco-editor') | null
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

export function useNotebookCollab({ projectId, fileName, cellId, editor, monaco }: UseNotebookCollabProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [activeUsers, setActiveUsers] = useState<CollabUser[]>([])
  const [myColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)])
  const [sessionId] = useState(() => `${Date.now()}-${Math.random()}`)
  const widgetsRef = useRef<import('monaco-editor').editor.IContentWidget[]>([])
  const suppressNextChangeRef = useRef(false)
  const myIdRef = useRef<string>('')
  const isApplyingRemoteChangeRef = useRef(false)

  useEffect(() => {
    if (!editor || !monaco || !projectId || !fileName || !cellId) return
    if (typeof window === 'undefined') return

    const supabase = createClient()
    const roomName = `notebook:${projectId}:${fileName}`

    let myId = ''
    let userName = ''
    let changeListener: import('monaco-editor').IDisposable | null = null
    let cursorListener: import('monaco-editor').IDisposable | null = null

    const setupCollab = async () => {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      myId = user.id
      myIdRef.current = user.id

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      userName = profile?.name || 'Unknown User'

      const channel = supabase.channel(roomName, {
        config: { broadcast: { self: false } }
      })

      channelRef.current = channel

      // Track cursor position
      const updateMyCursor = () => {
        const position = editor.getPosition()
        if (position && channel) {
          console.log('[NotebookCollab] Sending cursor update for cell:', cellId, { line: position.lineNumber, column: position.column })
          channel.send({
            type: 'broadcast',
            event: 'cursor',
            payload: {
              userId: myId,
              userName: userName,
              color: myColor,
              cellId: cellId,
              cursor: { line: position.lineNumber, column: position.column }
            }
          })
        }
      }

      // Listen for text changes
      changeListener = editor.onDidChangeModelContent((e: import('monaco-editor').editor.IModelContentChangedEvent) => {
        if (suppressNextChangeRef.current) {
          suppressNextChangeRef.current = false
          return
        }

        if (isApplyingRemoteChangeRef.current) {
          return
        }

        // Broadcast the change for this specific cell
        e.changes.forEach((change: import('monaco-editor').editor.IModelContentChange) => {
          channel.send({
            type: 'broadcast',
            event: 'change',
            payload: {
              sessionId: sessionId,
              userId: myId,
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
        })

        updateMyCursor()
      })

      // Listen for cursor position changes
      cursorListener = editor.onDidChangeCursorPosition(() => {
        updateMyCursor()
      })

      // Listen for editor blur (when user leaves the editor)
      const blurListener = editor.onDidBlurEditorText(() => {
        console.log('[NotebookCollab] Editor blurred for cell:', cellId)
        channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId: myId,
            userName: userName,
            color: myColor,
            cellId: cellId,
            cursor: null // Clear cursor when user leaves
          }
        })
      })

      // Listen for editor focus (when user returns to the editor)
      const focusListener = editor.onDidFocusEditorText(() => {
        console.log('[NotebookCollab] Editor focused for cell:', cellId)
        updateMyCursor()
      })

      // Store listeners for cleanup
      interface ChannelWithListeners extends RealtimeChannel {
        _blurListener?: import('monaco-editor').IDisposable
        _focusListener?: import('monaco-editor').IDisposable
      }
      ;(channel as ChannelWithListeners)._blurListener = blurListener
      ;(channel as ChannelWithListeners)._focusListener = focusListener

      // Receive changes from others - only apply to the correct cell
      channel
        .on('broadcast', { event: 'change' }, ({ payload }) => {
          // Ignore our own changes
          if (payload.sessionId === sessionId) {
            console.log('[NotebookCollab] Ignoring own change broadcast')
            return
          }

          // Only apply changes for this specific cell
          if (payload.cellId !== cellId) return

          console.log('[NotebookCollab] Received text change for cell:', cellId, payload)

          // Apply change immediately with proper flags
          if (!editor || !monaco) return

          // Preserve scroll position and cursor
          const currentPosition = editor.getPosition()
          const scrollTop = editor.getScrollTop()
          const scrollLeft = editor.getScrollLeft()

          // Set flags to prevent echo
          isApplyingRemoteChangeRef.current = true
          suppressNextChangeRef.current = true

          try {
            editor.executeEdits('remote', [{
              range: new monaco.Range(
                payload.range.startLineNumber,
                payload.range.startColumn,
                payload.range.endLineNumber,
                payload.range.endColumn
              ),
              text: payload.text,
              forceMoveMarkers: false
            }])

            // Restore scroll position immediately (before next frame)
            requestAnimationFrame(() => {
              editor.setScrollTop(scrollTop)
              editor.setScrollLeft(scrollLeft)

              // Restore cursor if it was set
              if (currentPosition) {
                editor.setPosition(currentPosition)
              }
            })
          } finally {
            // Reset flags after a short delay
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false
              suppressNextChangeRef.current = false
            }, 10)
          }
        })
        .on('broadcast', { event: 'cursor' }, ({ payload }) => {
          // Only show cursors for this specific cell
          if (payload.cellId !== cellId) return

          console.log('[NotebookCollab] Received cursor update for cell:', cellId, payload)
          setActiveUsers(prev => {
            const filtered = prev.filter(u => u.id !== payload.userId || u.cellId !== payload.cellId)
            if (!payload.cursor) {
              // User left this cell
              return filtered
            }
            const newUser = {
              id: payload.userId,
              name: payload.userName || `User ${payload.userId.substring(0, 4)}`,
              color: payload.color,
              cellId: payload.cellId,
              cursor: payload.cursor
            }
            return [...filtered, newUser]
          })
        })
        .subscribe((status) => {
          console.log('[NotebookCollab] Channel subscription status:', status, 'for cell:', cellId)
          if (status === 'SUBSCRIBED') {
            console.log('[NotebookCollab] Successfully subscribed to notebook room:', roomName, 'cell:', cellId)
            updateMyCursor()
          }
        })
    }

    setupCollab()

    return () => {
      if (changeListener) changeListener.dispose()
      if (cursorListener) cursorListener.dispose()
      if (channelRef.current) {
        // Dispose blur/focus listeners
        interface ChannelWithListeners extends RealtimeChannel {
          _blurListener?: import('monaco-editor').IDisposable
          _focusListener?: import('monaco-editor').IDisposable
        }
        const channel = channelRef.current as ChannelWithListeners
        const blurListener = channel._blurListener
        const focusListener = channel._focusListener
        if (blurListener) blurListener.dispose()
        if (focusListener) focusListener.dispose()

        // Send cursor clear before unsubscribe
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId: myIdRef.current,
            cellId: cellId,
            cursor: null
          }
        })

        channelRef.current.unsubscribe()
      }
    }
  }, [editor, monaco, projectId, fileName, cellId, myColor])

  // Render cursor widgets
  useEffect(() => {
    if (!editor || !monaco) return

    console.log('[NotebookCollab] Rendering cursor widgets for cell:', cellId, 'users:', activeUsers)

    // Remove old widgets
    widgetsRef.current.forEach(widget => {
      editor.removeContentWidget(widget)
    })
    widgetsRef.current = []

    // Create new widgets for each user in this cell
    activeUsers.forEach(user => {
      if (!user.cursor || user.cellId !== cellId) return

      const widgetId = `remote-cursor-${user.id}-${cellId}`

      const cursorWidget = {
        getId: () => widgetId,
        getDomNode: () => {
          const node = document.createElement('div')
          node.className = 'remote-cursor-widget'
          node.style.cssText = 'pointer-events: none; z-index: 100;'
          node.innerHTML = `
            <div style="
              position: relative;
              pointer-events: none;
            ">
              <div style="
                position: absolute;
                left: 2px;
                top: -22px;
                background: ${user.color};
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 500;
                white-space: nowrap;
              ">${user.name}</div>
              <div style="
                width: 2px;
                height: 20px;
                background: ${user.color};
                animation: blink 1s infinite;
              "></div>
            </div>
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
              monaco.editor.ContentWidgetPositionPreference.EXACT
            ]
          }
        }
      }

      editor.addContentWidget(cursorWidget)
      widgetsRef.current.push(cursorWidget)
      console.log('[NotebookCollab] Added cursor widget for:', user.name, 'in cell:', cellId)
    })

    // Add blinking animation
    const existingStyle = document.getElementById('notebook-remote-cursor-styles')
    if (!existingStyle) {
      const style = document.createElement('style')
      style.id = 'notebook-remote-cursor-styles'
      style.innerHTML = `
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      widgetsRef.current.forEach(widget => {
        editor.removeContentWidget(widget)
      })
      widgetsRef.current = []
    }
  }, [activeUsers, editor, monaco, cellId])

  return { activeUsers, myColor }
}
