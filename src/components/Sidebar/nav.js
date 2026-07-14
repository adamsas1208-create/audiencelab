import {
  Anchor,
  BarChart3,
  Brain,
  Clapperboard,
  Cpu,
  Dumbbell,
  Film,
  Gamepad2,
  Gem,
  Globe,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  Plane,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Vote,
} from 'lucide-react'

// Primary workspace views. The Cortex sits right after the dashboard as the
// creator's cinematic mission-control view — the "brain" that sees all the
// audience/hook/AI data at once.
export const workspace = [
  { id: 'dashboard', label: 'Rooms Dashboard', icon: LayoutGrid },
  { id: 'cortex', label: 'The Cortex', icon: Brain },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'vote', label: 'Vote View', icon: Vote },
  { id: 'studio', label: 'Creator Studio', icon: BarChart3 },
  { id: 'videolab', label: 'VideoLab', icon: Film },
  { id: 'critique', label: 'Critique Room', icon: MessagesSquare },
]

// The 11 elite rooms (channels). Hook Lab is the flagship and sits at the top.
export const rooms = [
  { id: 'hook-lab', label: 'Hook Lab', icon: Anchor, flagship: true },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'tech-finance', label: 'Tech & Finance', icon: Cpu },
  { id: 'lifestyle-beauty', label: 'Lifestyle & Beauty', icon: Gem },
  { id: 'fitness-health', label: 'Fitness & Health', icon: Dumbbell },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { id: 'business-marketing', label: 'Business & Marketing', icon: TrendingUp },
  { id: 'food-cooking', label: 'Food & Cooking', icon: UtensilsCrossed },
  { id: 'travel-adventure', label: 'Travel & Adventure', icon: Plane },
  { id: 'education-science', label: 'Education & Science', icon: GraduationCap },
  { id: 'general', label: 'General / Off-Topic', icon: Globe },
]

export const roomIds = new Set(rooms.map((r) => r.id))
