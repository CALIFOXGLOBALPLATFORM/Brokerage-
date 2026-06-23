import React from 'react'
import { Router } from 'wouter'
import { AuthProvider } from '@/providers/AuthProvider'
import NavBar from '@/components/NavBar'
import Hero from '@/components/Hero'
import LiveRates from '@/components/LiveRates'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NavBar />
        <main>
          <Hero />
          <div className="container">
            <LiveRates />
          </div>
        </main>
      </AuthProvider>
    </Router>
  )
}
