// Mock data powering the AudienceLab dashboard.
// A "hook" is the opening line of a piece of short-form content that creators
// test against each other to find the highest-converting version.

export const platforms = {
  tiktok: { label: 'TikTok', color: '#34e0a1' },
  youtube: { label: 'YouTube', color: '#6260ff' },
  instagram: { label: 'Instagram', color: '#e879f9' },
  x: { label: 'X', color: '#94a3b8' },
}

// Matchups shown in the Vote View. Each matchup can hold up to 4 options
// (Option A, B, C, D) that compete against one another.
export const matchups = [
  {
    id: 'm1',
    platform: 'tiktok',
    category: 'Fitness',
    creator: 'mayalifts',
    options: [
      {
        id: 'h1',
        text: 'I tried the 5am cold plunge for 30 days. Day 7 broke me.',
        votes: 1284,
      },
      {
        id: 'h2',
        text: 'Stop doing cardio. Do this instead and watch what happens.',
        votes: 1976,
      },
      {
        id: 'h3',
        text: 'The one stretch I wish I started 10 years ago.',
        votes: 1102,
      },
      {
        id: 'h4',
        text: 'Your warm-up is the workout. Here is why nobody told you.',
        votes: 864,
      },
    ],
  },
  {
    id: 'm2',
    platform: 'youtube',
    category: 'Finance',
    creator: 'finbynoah',
    options: [
      {
        id: 'h5',
        text: 'The $0 budget that let me quit my job in 18 months.',
        votes: 942,
      },
      {
        id: 'h6',
        text: 'Nobody tells you this about your first $10k. So I will.',
        votes: 1103,
      },
      {
        id: 'h7',
        text: 'I lived on $40 a week for a year. Here is what changed.',
        votes: 778,
      },
    ],
  },
  {
    id: 'm3',
    platform: 'instagram',
    category: 'Cooking',
    creator: 'kitchenkai',
    options: [
      {
        id: 'h8',
        text: 'This is the only pasta recipe you will ever need. Full stop.',
        votes: 2210,
      },
      {
        id: 'h9',
        text: 'I asked a 3-star chef his cheapest meal. I was not ready.',
        votes: 2188,
      },
    ],
  },
]

// Hooks owned by the signed-in creator, shown in Creator Studio.
export const myHooks = [
  {
    id: 'c1',
    text: 'Stop doing cardio. Do this instead and watch what happens.',
    platform: 'tiktok',
    status: 'live',
    score: 92,
    votes: 1976,
    winRate: 0.61,
    impressions: 48200,
    trend: 'up',
  },
  {
    id: 'c2',
    text: 'I tried the 5am cold plunge for 30 days. Day 7 broke me.',
    platform: 'tiktok',
    status: 'live',
    score: 78,
    votes: 1284,
    winRate: 0.39,
    impressions: 31050,
    trend: 'down',
  },
  {
    id: 'c3',
    text: 'The one stretch I wish I started 10 years ago.',
    platform: 'instagram',
    status: 'testing',
    score: 64,
    votes: 412,
    winRate: 0.47,
    impressions: 9800,
    trend: 'up',
  },
  {
    id: 'c4',
    text: 'Your warm-up is the workout. Here is why.',
    platform: 'youtube',
    status: 'draft',
    score: 0,
    votes: 0,
    winRate: 0,
    impressions: 0,
    trend: 'flat',
  },
]

export const studioStats = [
  { id: 's1', label: 'Avg. Hook Score', value: '81', delta: '+6.2%', positive: true },
  { id: 's2', label: 'Total Votes', value: '3,672', delta: '+812', positive: true },
  { id: 's3', label: 'Win Rate', value: '54%', delta: '+3.1%', positive: true },
  { id: 's4', label: 'Live Tests', value: '2', delta: '0', positive: true },
]

// 14-day score sparkline for the Creator Studio chart.
export const scoreHistory = [
  62, 65, 61, 68, 72, 70, 74, 73, 78, 76, 80, 79, 83, 81,
]
