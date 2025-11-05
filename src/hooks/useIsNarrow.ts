"use client"
import { useEffect, useState } from "react"

export function useIsNarrow(bp = 768) {
  const [narrow, set] = useState(false)
  
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`)
    const fn = () => set(mq.matches)
    fn(); mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [bp])
  
  return narrow
}
