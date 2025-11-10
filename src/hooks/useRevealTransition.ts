"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMotionValue, animate } from 'framer-motion'

type ButtonPosition = {
  x: number
  y: number
}

type UseRevealTransitionReturn = {
  isAnimating: boolean
  circleSizeMotion: ReturnType<typeof useMotionValue<number>>
  buttonPosition: ButtonPosition | null
  startAnimation: (buttonRef: React.RefObject<HTMLButtonElement>) => void
  startAnimationFromPosition: (position: ButtonPosition) => void
  maxCircleSize: number
  circleSize: number
}

const ANIMATION_DURATION = 3 // 3 secondes
const EASE_OUT_CUBIC = [0.33, 1, 0.68, 1] as [number, number, number, number]

export function useRevealTransition(): UseRevealTransitionReturn {
  const [isAnimating, setIsAnimating] = useState(false)
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition | null>(null)
  const [circleSize, setCircleSize] = useState(0)
  const maxCircleSizeRef = useRef(0)

  // Calculer la taille maximale du cercle
  const calculateMaxCircleSize = useCallback(() => {
    if (typeof window === 'undefined') return 0
    const width = window.innerWidth
    const height = window.innerHeight
    return Math.sqrt(width * width + height * height)
  }, [])

  // Motion value pour l'animation du cercle
  const circleSizeMotion = useMotionValue(0)

  // Initialiser la taille max du cercle
  useEffect(() => {
    maxCircleSizeRef.current = calculateMaxCircleSize()
    
    const handleResize = () => {
      maxCircleSizeRef.current = calculateMaxCircleSize()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculateMaxCircleSize])

  // Suivre la taille du cercle pour l'exposer
  useEffect(() => {
    const unsubscribe = circleSizeMotion.on('change', (size: number) => {
      setCircleSize(size)
    })
    return () => unsubscribe()
  }, [circleSizeMotion])

  const startAnimation = useCallback((buttonRef: React.RefObject<HTMLButtonElement>) => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    setButtonPosition({ x, y })
    setIsAnimating(true)

    // Démarrer l'animation du cercle
    circleSizeMotion.set(0)
    animate(circleSizeMotion, maxCircleSizeRef.current, {
      duration: ANIMATION_DURATION,
      ease: EASE_OUT_CUBIC,
    })
  }, [circleSizeMotion])

  const startAnimationFromPosition = useCallback((position: ButtonPosition) => {
    setButtonPosition(position)
    setIsAnimating(true)

    // Démarrer l'animation du cercle
    circleSizeMotion.set(0)
    animate(circleSizeMotion, maxCircleSizeRef.current, {
      duration: ANIMATION_DURATION,
      ease: EASE_OUT_CUBIC,
    })
  }, [circleSizeMotion])

  return {
    isAnimating,
    circleSizeMotion,
    buttonPosition,
    startAnimation,
    startAnimationFromPosition,
    maxCircleSize: maxCircleSizeRef.current,
    circleSize,
  }
}

