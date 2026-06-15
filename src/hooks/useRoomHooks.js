import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Live hooks for a single room, used by the Vote View.
 *
 * Returns { hooks, status, error } where status is
 * 'loading' | 'live' | 'error'. Vote counts stay current because the DB
 * trigger updates hooks.votes on every vote, and we subscribe to those
 * UPDATEs (and to new hooks) filtered to this room.
 */
export default function useRoomHooks(roomId) {
  const [hooks, setHooks] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!roomId) return undefined
    let cancelled = false

    const load = async () => {
      setStatus('loading')
      const { data, error: err } = await supabase
        .from('hooks')
        .select('id, text, votes')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (err) {
        setError(err.message)
        setStatus('error')
        return
      }
      setHooks(data ?? [])
      setStatus('live')
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
  }, [roomId])

  return { hooks, status, error }
}
