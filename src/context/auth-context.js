import { createContext, useContext } from 'react'

// Shared auth context. Kept in a component-free module so React Fast Refresh
// stays happy (a file may only export components for HMR).
export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}
