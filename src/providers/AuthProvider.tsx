import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Transaction = { id: string; type: 'deposit' | 'withdrawal'; amount: number; status: string; date: string; note?: string }
type AuthUser = { id: string; name: string; email: string; passwordHash: string; plan: string; balance: number; transactions: Transaction[] }

type AuthCtx = {
  user: AuthUser | null
  login: (email: string, password: string) => boolean
  register: (name: string, email: string, password: string, plan: string) => boolean
  logout: () => void
  addTransaction: (type: 'deposit' | 'withdrawal', amount: number, note?: string) => void
}

const AuthContext = createContext<AuthCtx | null>(null)
const USERS_KEY = 'califox_users'
const SESSION_KEY = 'califox_session'

function simpleHash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h.toString(36)
}

function loadUsers(): AuthUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as AuthUser[] } catch { return [] }
}
function saveUsers(users: AuthUser[]) { localStorage.setItem(USERS_KEY, JSON.stringify(users)) }
function loadSession(): AuthUser | null {
  try { const id = sessionStorage.getItem(SESSION_KEY); if (!id) return null; return loadUsers().find(u => u.id === id) ?? null } catch { return null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadSession)

  useEffect(() => {
    // keep session updated if storage changes elsewhere
    const onStorage = () => setUser(loadSession())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback((email: string, password: string) => {
    const users = loadUsers()
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === simpleHash(password))
    if (!found) return false
    sessionStorage.setItem(SESSION_KEY, found.id)
    setUser(found)
    return true
  }, [])

  const register = useCallback((name: string, email: string, password: string, plan: string) => {
    const users = loadUsers()
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return false
    const newUser: AuthUser = { id: Math.random().toString(36).slice(2), name, email, passwordHash: simpleHash(password), plan, balance: 0, transactions: [] }
    saveUsers([...users, newUser])
    sessionStorage.setItem(SESSION_KEY, newUser.id)
    setUser(newUser)
    return true
  }, [])

  const logout = useCallback(() => { sessionStorage.removeItem(SESSION_KEY); setUser(null) }, [])

  const addTransaction = useCallback((type: 'deposit' | 'withdrawal', amount: number, note?: string) => {
    if (!user) return
    const tx: Transaction = { id: Math.random().toString(36).slice(2), type, amount, status: 'completed', date: new Date().toISOString(), note }
    const newBalance = type === 'deposit' ? user.balance + amount : Math.max(0, user.balance - amount)
    const updated: AuthUser = { ...user, balance: newBalance, transactions: [tx, ...user.transactions] }
    const users = loadUsers().map(u => u.id === user.id ? updated : u)
    saveUsers(users)
    setUser(updated)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, addTransaction }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
