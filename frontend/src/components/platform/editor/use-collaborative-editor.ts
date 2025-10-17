import { useEffect, useRef } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface CollaborativeEditorProps {
  projectId: string
  fileName: string
  editor: import('monaco-editor').editor.IStandaloneCodeEditor | null
  monaco: typeof import('monaco-editor') | null
}

export function useCollaborativeEditor({ projectId, fileName, editor, monaco }: CollaborativeEditorProps) {
  const ydocRef = useRef<Y.Doc | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const bindingRef = useRef<import('y-monaco').MonacoBinding | null>(null)
  const awarenessRef = useRef<Awareness | null>(null)

  useEffect(() => {
    if (!editor || !monaco || !projectId || !fileName) return
    if (typeof window === 'undefined') return // Skip on server-side

    const supabase = createClient()
    const roomName = `${projectId}:${fileName}`

    // Create Yjs document
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText('monaco')
    ydocRef.current = ydoc

    // Create awareness for cursor positions
    const awareness = new Awareness(ydoc)
    awarenessRef.current = awareness

    // Dynamically import MonacoBinding (client-side only)
    import('y-monaco').then(({ MonacoBinding }) => {
      // Bind Yjs to Monaco
      const model = editor.getModel()
      if (!model) return

      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        awareness
      )
      bindingRef.current = binding
    })

    // Set up Supabase Realtime channel
    const channel = supabase.channel(roomName, {
      config: {
        broadcast: { self: true }
      }
    })

    channelRef.current = channel

    // Listen for Yjs updates from other users
    channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        if (payload.update) {
          Y.applyUpdate(ydoc, new Uint8Array(payload.update))
        }
      })
      .on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
        // Handle awareness updates (cursor positions, etc.)
        if (payload.state) {
          awareness.setLocalState(payload.state)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Collab] Connected to ${roomName}`)

          // Request initial state from other clients
          await channel.send({
            type: 'broadcast',
            event: 'request-state',
            payload: {}
          })
        }
      })

    // Broadcast Yjs updates to other users
    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      // Don't broadcast updates that came from the network
      if (origin !== 'remote') {
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(update) }
        })
      }
    })

    // Handle state requests from new clients
    channel.on('broadcast', { event: 'request-state' }, async () => {
      const state = Y.encodeStateAsUpdate(ydoc)
      await channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: Array.from(state) }
      })
    })

    // Cleanup
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy()
      }
      channel.unsubscribe()
      ydoc.destroy()
      console.log(`[Collab] Disconnected from ${roomName}`)
    }
  }, [editor, monaco, projectId, fileName])

  return {
    ydoc: ydocRef.current,
    awareness: awarenessRef.current
  }
}
