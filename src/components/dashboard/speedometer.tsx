"use client"

import { useMemo } from "react"

// Styles pour l'effet lumineux au hover
const glowStyles = `
  @keyframes star-twinkle {
    0%, 100% { 
      opacity: 0;
      transform: scale(0) rotate(0deg);
    }
    50% { 
      opacity: 1;
      transform: scale(1) rotate(180deg);
    }
  }
  .speedometer-container:hover .speedometer-halo {
    opacity: 1;
  }
  .speedometer-container:hover .speedometer-star {
    animation: star-twinkle 1.5s ease-in-out infinite;
  }
  .speedometer-halo {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }
  .speedometer-star {
    opacity: 0;
  }
`

interface SpeedometerProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  showLabel?: boolean
  label?: string
  unit?: string
  showPercentage?: boolean // Contrôle la visibilité du pourcentage sous le speedometer
  onContextMenu?: (e: React.MouseEvent) => void // Pour le menu contextuel
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
  showPercentage = true, // Par défaut visible
  onContextMenu,
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

  // Vérifier si l'objectif est atteint (100% ou plus)
  const isGoalAchieved = percentage >= 100

  // Générer des positions d'étoiles autour du speedometer (mémorisé pour éviter les changements à chaque rendu)
  const starPositions = useMemo(() => {
    const stars = []
    const centerX = size / 2
    const centerY = size / 2
    const starRadius = size * 0.55 // Rayon autour duquel placer les étoiles
    
    // 7 étoiles positionnées autour du demi-cercle avec différentes tailles
    const numStars = 7
    // Valeurs déterministes pour les tailles basées sur l'index (pour éviter Math.random())
    const sizeMultipliers = [0.9, 1.1, 0.85, 1.15, 0.95, 1.05, 1.0]
    
    for (let i = 0; i < numStars; i++) {
      const angle = (-180 + (i * 180 / (numStars - 1))) * (Math.PI / 180) // De -180° à 0°
      const x = centerX + starRadius * Math.cos(angle)
      const y = centerY + starRadius * Math.sin(angle)
      stars.push({ x, y, delay: i * 0.15, sizeMultiplier: sizeMultipliers[i] })
    }
    return stars
  }, [size])

  // Fonction pour générer une étoile SVG
  const renderStar = (x: number, y: number, delay: number, sizeMultiplier: number = 1) => (
    <g
      key={`star-${x}-${y}`}
      className="speedometer-star"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${x}, ${y}) scale(${sizeMultiplier})`}
    >
      {/* Étoile principale */}
      <path
        d="M 0,-5 L 1.5,-1.5 L 5,-1.5 L 2,1.5 L 3,5 L 0,2.5 L -3,5 L -2,1.5 L -5,-1.5 L -1.5,-1.5 Z"
        fill="#fbbf24"
        opacity="0.95"
        style={{ filter: "drop-shadow(0 0 3px rgba(251, 191, 36, 1))" }}
      />
      {/* Point central brillant */}
      <circle cx="0" cy="0" r="1.5" fill="#fef3c7" opacity="0.9" />
    </g>
  )

  return (
    <>
      <style>{glowStyles}</style>
      <div 
        className={`flex flex-col items-center justify-center speedometer-container ${isGoalAchieved ? "cursor-pointer" : ""}`}
        onContextMenu={onContextMenu}
      >
      <div className="relative" style={{ width: size, height: size / 2 + 10 }}>
        {/* Halo de lumière très léger au hover (seulement si objectif atteint) */}
        {isGoalAchieved && (
          <>
            {/* Halo principal très subtil */}
            <div 
              className="speedometer-halo absolute inset-0 rounded-full bg-gradient-to-r from-yellow-200/15 via-yellow-100/20 to-yellow-200/15 blur-2xl" 
              style={{ 
                width: size + 30, 
                height: size / 2 + 40,
                top: -15,
                left: -15,
                pointerEvents: "none"
              }} 
            />
            {/* Halo secondaire encore plus subtil */}
            <div 
              className="speedometer-halo absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300/10 via-yellow-200/15 to-yellow-300/10 blur-xl" 
              style={{ 
                width: size + 20, 
                height: size / 2 + 30,
                top: -10,
                left: -10,
                pointerEvents: "none"
              }} 
            />
          </>
        )}
        <svg
          width={size}
          height={size / 2 + 10}
          viewBox={`0 0 ${size} ${size / 2 + 10}`}
          className="overflow-visible relative z-10"
        >
          {/* Étoiles brillantes au hover (seulement si objectif atteint) */}
          {isGoalAchieved && starPositions.map((star, index) => 
            renderStar(star.x, star.y, star.delay, star.sizeMultiplier)
          )}
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
      {showLabel && showPercentage && (
        <div className="w-full text-center mt-1">
          <div className="text-xs font-medium" style={{ color: finalColor }}>
            {percentage.toFixed(0)}%
          </div>
        </div>
      )}
      </div>
    </>
  )
}