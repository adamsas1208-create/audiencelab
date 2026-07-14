// Single source of truth for free-tier quantity caps — read by both
// DataProvider's client-side enforcement and Sidebar's upsell copy. The
// actual non-bypassable backstop lives in
// supabase/migrations/0009_plan_limits.sql as DB triggers mirroring these
// same numbers; keep the two in sync if you change either.
export const FREE_LIMITS = {
  contacts: 250,
  polls: 3,
  hookTests: 5,
}
