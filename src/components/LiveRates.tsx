import React from 'react'
import useLiveRates from '@/hooks/useLiveRates'

export default function LiveRates(){
  const rates = useLiveRates()
  return (
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:24}}>
      {rates.map(r => (
        <div key={r.label} style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8,minWidth:160}}>
          <div style={{fontSize:12,color:'var(--muted)'}}>{r.label}</div>
          <div style={{fontWeight:700,marginTop:6}}>{r.prefix ?? ''}{r.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}
