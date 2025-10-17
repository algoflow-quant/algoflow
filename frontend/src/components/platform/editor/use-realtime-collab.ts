'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface CollabUser {
  id: string
  name: string
  color: string
  cursor?: { line: number; column: number }
}

interface UseRealtimeCollabProps {
  projectId: string
  fileName: string
  editor: import('monaco-editor').editor.IStandaloneCodeEditor | null
  monaco: typeof import('monaco-editor') | null
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

export function useRealtimeCollab({ projectId, fileName, editor, monaco }: UseRealtimeCollabProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [activeUsers, setActiveUsers] = useState<CollabUser[]>([])
  const [myColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)])
  const widgetsRef = useRef<import('monaco-editor').editor.IContentWidget[]>([])
  const suppressNextChangeRef = useRef(false)
  const myIdRef = useRef<string>('')

  useEffect(() => {
    if (!editor || !monaco || !projectId || !fileName) return
    if (typeof window === 'undefined') return

    const supabase = createClient()
    const roomName = `collab:${projectId}:${fileName}`

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
          console.log('[Collab] Sending cursor update:', { line: position.lineNumber, column: position.column })
          channel.send({
            type: 'broadcast',
            event: 'cursor',
            payload: {
              userId: myId,
              userName: userName,
              color: myColor,
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

        // Broadcast the change
        e.changes.forEach((change: import('monaco-editor').editor.IModelContentChange) => {
          channel.send({
            type: 'broadcast',
            event: 'change',
            payload: {
              userId: myId,
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
        console.log('[Collab] Editor blurred, sending empty cursor')
        channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId: myId,
            userName: userName,
            color: myColor,
            cursor: null // Clear cursor when user leaves
          }
        })
      })

      // Listen for editor focus (when user returns to the editor)
      const focusListener = editor.onDidFocusEditorText(() => {
        console.log('[Collab] Editor focused, sending cursor position')
        updateMyCursor()
      })

      // Store listeners for cleanup
      interface ChannelWithListeners extends RealtimeChannel {
        _blurListener?: import('monaco-editor').IDisposable
        _focusListener?: import('monaco-editor').IDisposable
      }
      ;(channel as ChannelWithListeners)._blurListener = blurListener
      ;(channel as ChannelWithListeners)._focusListener = focusListener

      // Receive changes from others
      channel
        .on('broadcast', { event: 'change' }, ({ payload }) => {
          console.log('[Collab] Received text change:', payload)
          suppressNextChangeRef.current = true

          editor.executeEdits('remote', [{
            range: new monaco.Range(
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
          console.log('[Collab] Received cursor update:', payload)
          setActiveUsers(prev => {
            const filtered = prev.filter(u => u.id !== payload.userId)
            const newUser = {
              id: payload.userId,
              name: payload.userName || `User ${payload.userId.substr(0, 4)}`,
              color: payload.color,
              cursor: payload.cursor
            }
            console.log('[Collab] Updated active users:', [...filtered, newUser])
            return [...filtered, newUser]
          })
        })
        .subscribe((status) => {
          console.log('[Collab] Channel subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('[Collab] Successfully subscribed to room:', roomName)
            // Send initial cursor position after subscription
            updateMyCursor()

            // Note: We no longer need periodic cursor updates
            // Cursor updates are sent on:
            // 1. Cursor position changes (onDidChangeCursorPosition)
            // 2. Text changes (onDidChangeModelContent)
            // 3. Editor focus (onDidFocusEditorText)
            // 4. Cleared on blur (onDidBlurEditorText)
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

        channelRef.current.unsubscribe()
      }
    }
  }, [editor, monaco, projectId, fileName, myColor])

  // Render cursor widgets
  useEffect(() => {
    if (!editor || !monaco) return

    // Show ALL users' cursors (including your cursor from other tabs)
    // The broadcast self: false already prevents seeing your own cursor from THIS tab
    console.log('[Collab] Rendering cursor widgets for all users:', activeUsers)

    // Remove old widgets
    widgetsRef.current.forEach(widget => {
      editor.removeContentWidget(widget)
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
      console.log('[Collab] Added cursor widget for:', user.name)
    })

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
    `
    document.head.appendChild(style)

    return () => {
      widgetsRef.current.forEach(widget => {
        editor.removeContentWidget(widget)
      })
      widgetsRef.current = []
    }
  }, [activeUsers, editor, monaco])

  return { activeUsers, myColor }
}
