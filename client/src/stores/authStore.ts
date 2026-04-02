import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  username: string | null
  token: string | null
  userId: string | null
  setAuth: (username: string, token: string, userId: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: null,
      token: null,
      userId: null,
      setAuth: (username, token, userId) => set({ username, token, userId }),
      clearAuth: () => set({ username: null, token: null, userId: null }),
    }),
    { name: 'aah-auth' }
  )
)
