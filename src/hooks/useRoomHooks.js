import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Live hooks for a single room, used by the Vote View.
 *
 * Returns { hooks, status, error, refetch, bumpHook } where status is
 * 'loading' | 'live' | 'error'.
 *
 * Counts stay correct without depending on realtime: callers optimistically
 * `bumpHook` then `refetch` for the authoritative value. The realtime
 * subscription is an extra channel for *other* users' votes. All three paths
 * write absolute counts (refetch/realtime) or +1 (bump reconciled by refetch),
 * so they never double-count.
 */
export default function useRoomHooks(roomId) {
  const [hooks, setHooks] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  // Loads (or reloads) the room's hooks. `status` starts at 'loading' from
  // useState, so there's no need to set it synchronously here.
  const refetch = useCallback(async () => {
    if (!roomId) return
    const { data, error: err } = await supabase
      .from('hooks')
      .select('id, text, votes')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (err) {
      setError(err.message)
      setStatus('error')
      return
    }
    setHooks(data ?? [])
    setStatus('live')
  }, [roomId])

  // Optimistic +1 for instant feedback; refetch/realtime reconcile to truth.
  const bumpHook = useCallback((hookId) => {
    setHooks((prev) =>
      prev.map((h) => (h.id === hookId ? { ...h, votes: h.votes + 1 } : h)),
    )
  }, [])

  useEffect(() => {
    if (!roomId) return undefined
    let cancelled = false

    const load = async () => {
      try {
        await refetch()
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    load()

    const channel = supabase
      .channel(`room-hooks-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hooks',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setHooks((prev) =>
            prev.map((h) =>
              h.id === payload.new.id ? { ...h, votes: payload.new.votes } : h,
            ),
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hooks',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setHooks((prev) =>
            prev.some((h) => h.id === payload.new.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: payload.new.id,
                    text: payload.new.text,
                    votes: payload.new.votes,
                  },
                ],
          )
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [roomId, refetch])

  return { hooks, status, error, refetch, bumpHook }
}
