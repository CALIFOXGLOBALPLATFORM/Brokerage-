import { useEffect, useState } from 'react'

type RateItem = { label: string; value: string | null; change: number | null; prefix?: string }

export default function useLiveRates(){
  const [rates, setRates] = useState<RateItem[]>([
    { label: 'EUR/USD', value: null, change: null },
    { label: 'GBP/USD', value: null, change: null },
    { label: 'BTC/USD', value: null, change: null, prefix: '$' },
    { label: 'ETH/USD', value: null, change: null, prefix: '$' }
  ])

  useEffect(() => {
    let mounted = true
    async function fetchAll(){
      try{
        const [usdBaseRes, cryptoRes] = await Promise.all([
          fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@1/latest/currencies/usd.json'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true')
        ])
        const usdBase = await usdBaseRes.json()
        const crypto = await cryptoRes.json()
        const usd = usdBase?.usd ?? {}
        const eurRate = usd?.eur ? (1 / usd.eur).toFixed(4) : null
        const gbpRate = usd?.gbp ? (1 / usd.gbp).toFixed(4) : null
        if (!mounted) return
        setRates([
          { label: 'EUR/USD', value: eurRate, change: null },
          { label: 'GBP/USD', value: gbpRate, change: null },
          { label: 'BTC/USD', value: crypto?.bitcoin?.usd?.toLocaleString('en-US') ?? null, change: crypto?.bitcoin?.usd_24h_change ?? null, prefix: '$' },
          { label: 'ETH/USD', value: crypto?.ethereum?.usd?.toLocaleString('en-US') ?? null, change: crypto?.ethereum?.usd_24h_change ?? null, prefix: '$' }
        ])
      }catch(e){
        // keep previous values
      }
    }
    fetchAll()
    const id = setInterval(fetchAll, 30000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return rates
}
