import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchRoomStats, getVoterId } from '../lib/rooms'

/**
 * Live room state for the dashboard.
 *
 * Returns:
 *   rooms   - array of { id, label, flagship, engagement, active_hooks,
 *             votes_today, total_votes, top_hook, flash } ordered by sort_order
 *   online  - number of creators currently present (Realtime Presence)
 *   status  - 'loading' | 'live' | 'error'
 *   error   - error message when status === 'error'
 *
 * Realtime wiring:
 *   - INSERTs on `votes`  -> increment that room's votes_today instantly + flash
 *   - UPDATEs on `hooks`  -> debounced refetch so top_hook / counts stay fresh
 *   - Presence channel    -> aggregate "creators online" count
 */
export default function useRoomsLive() {
  const [rooms, setRooms] = useState([])
  const [online, setOnline] = useState(0)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  // Per-room flash timers, so a vote briefly highlights its card.
  const flashTimers = useRef({})
  // Debounce timer for the hooks-change refetch.
  const refetchTimer = useRef(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchRoomStats()
        if (cancelled) return
        setRooms(data.map((r) => ({ ...r, flash: false })))
        setStatus('live')
      } catch (e) {
        if (cancelled) return
        setError(e?.message ?? String(e))
        setStatus('error')
      }
    }

    const debouncedRefetch = () => {
      clearTimeout(refetchTimer.current)
      refetchTimer.current = setTimeout(async () => {
        try {
          const data = await fetchRoomStats()
          if (!cancelled) setRooms(data.map((r) => ({ ...r, flash: false })))
        } catch {
          /* keep last-known data on a transient refetch failure */
        }
      }, 600)
    }

    const flashRoom = (roomId) => {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? { ...r, votes_today: (r.votes_today ?? 0) + 1, flash: true }
            : r,
        ),
      )
      clearTimeout(flashTimers.current[roomId])
      flashTimers.current[roomId] = setTimeout(() => {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, flash: false } : r)),
        )
      }, 800)
    }

    load()

    // Data changes channel: live vote stream + hook updates.
    const dataChannel = supabase
      .channel('rooms-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          const roomId = payload.new?.room_id
          if (roomId) flashRoom(roomId)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'hooks' },
        debouncedRefetch,
      )
      .subscribe()

    // Presence channel: count distinct creators currently online.
    const presence = supabase.channel('dashboard-presence', {
      config: { presence: { key: getVoterId() } },
    })
    presence
      .on('presence', { event: 'sync' }, () => {
        setOnline(Object.keys(presence.presenceState()).length)
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          presence.track({ online_at: new Date().toISOString() })
        }
      })

    const timers = flashTimers.current
    return () => {
      cancelled = true
      clearTimeout(refetchTimer.current)
      Object.values(timers).forEach(clearTimeout)
      supabase.removeChannel(dataChannel)
      supabase.removeChannel(presence)
    }
  }, [])

  return { rooms, online, status, error }
}
