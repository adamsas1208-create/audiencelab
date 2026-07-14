import {
  Anchor,
  BarChart3,
  Clapperboard,
  Cpu,
  Dumbbell,
  Gamepad2,
  Gem,
  Globe,
  GraduationCap,
  LayoutGrid,
  Plane,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Vote,
} from 'lucide-react'

// Primary workspace views.
export const workspace = [
  { id: 'dashboard', label: 'Rooms Dashboard', icon: LayoutGrid },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'vote', label: 'Vote View', icon: Vote },
  { id: 'studio', label: 'Creator Studio', icon: BarChart3 },
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
