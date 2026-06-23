import React from 'react'

export default function Hero(){
  return (
    <section style={{minHeight:400,display:'flex',alignItems:'center',justifyContent:'center',paddingTop:40,paddingBottom:40}}>
      <div className="container" style={{textAlign:'center'}}>
        <h1 style={{fontSize:36,margin:0}}>Trade Smarter. Grow Faster.</h1>
        <p style={{color:'var(--muted)'}}>Access global markets with expert guidance and a modern trading UI.</p>
      </div>
    </section>
  )
}
