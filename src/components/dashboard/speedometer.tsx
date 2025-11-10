"use client"

import { useMemo } from "react"

interface SpeedometerProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  showLabel?: boolean
  label?: string
  unit?: string
}

export function Speedometer({
  value,
  max,
  size = 120,
  strokeWidth = 12,
  color = "hsl(var(--primary))",
  showLabel = true,
  label,
  unit = "",
}: SpeedometerProps) {
  const percentage = useMemo(() => {
    if (max === 0) return 0
    return Math.min(Math.max((value / max) * 100, 0), 100)
  }, [value, max])

  const getColor = () => {
    // Mode ultime : 95%+ en violet
    if (percentage >= 95) return "#a855f7" // violet-500
    if (percentage >= 90) return "#22c55e" // vert pour 90-94%
    if (percentage >= 75) return "#22c55e" // vert
    if (percentage >= 50) return "#eab308" // jaune
    if (percentage >= 25) return "#f97316" // orange
    return "#ef4444" // rouge
  }

  const finalColor = color === "hsl(var(--primary))" ? getColor() : color
  const radius = (size - strokeWidth) / 2
  const circumference = Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  // Le demi-cercle va de gauche (bas) à droite (bas)
  // En coordonnées SVG : -180° à 0° avec centre en bas
  // On ajuste : -180° + progression
  const needleAngle = -180 + (percentage / 100) * 180

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size / 2 + 10 }}>
        <svg
          width={size}
          height={size / 2 + 10}
          viewBox={`0 0 ${size} ${size / 2 + 10}`}
          className="overflow-visible"
        >
          {/* Fond du cadran */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Barre de progression */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={finalColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
          {/* Aiguille */}
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <line
              x1="0"
              y1="0"
              x2={radius * 0.85 * Math.cos(needleAngle * (Math.PI / 180))}
              y2={radius * 0.85 * Math.sin(needleAngle * (Math.PI / 180))}
              stroke={finalColor}
              strokeWidth={3}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
            <circle cx="0" cy="0" r={strokeWidth / 2} fill={finalColor} />
          </g>
        </svg>
      </div>
      {/* Pourcentage sous le speedometer */}
      {showLabel && (
        <div className="w-full text-center mt-1">
          <div className="text-xs font-medium" style={{ color: finalColor }}>
            {percentage.toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  )
}