import { createContext, useContext } from 'react'

// Shared, client-side source of truth for the creator's public profile, their
// contacts/audience, and lightweight analytics. Persisted to localStorage by
// DataProvider so edits and captured leads survive a refresh.
export const DataContext = createContext(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) {
    throw new Error('useData must be used within a <DataProvider>.')
  }
  return ctx
}
