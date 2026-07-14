import RoomsGrid from '../Rooms/RoomsGrid'

/**
 * The Rooms Dashboard view — the landing surface that renders alongside the
 * sidebar. Wraps the interactive RoomsGrid and forwards room entry up so the
 * app can switch to that room's Vote View.
 *
 * @param {(id: string) => void} [onEnterRoom] - navigate into a room
 */
export default function Dashboard({ onEnterRoom }) {
  return <RoomsGrid onEnterRoom={onEnterRoom} />
}
