import React from 'react'
import { FiMenu } from 'react-icons/fi'
import { useAuth } from '@/providers/AuthProvider'

export default function NavBar() {
  const { user } = useAuth()
  return (
    <header style={{position:'sticky',top:0,background:'#07162a',padding:'12px 0',zIndex:40,borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
      <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontWeight:700,fontSize:20}}>Califox <span style={{color:'#06b6d4'}}>Global</span></div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <nav style={{display:'none'}} />
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {user ? <div style={{padding:'6px 10px',borderRadius:20,background:'rgba(6,182,212,0.08)'}}>{user.name.split(' ')[0]}</div> : <button style={{padding:'6px 10px'}}>Sign In</button>}
            <button aria-label="menu"><FiMenu /></button>
          </div>
        </div>
      </div>
    </header>
  )
}
