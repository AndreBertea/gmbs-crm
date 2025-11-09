"use client"

import React, { useState, useMemo } from "react"
import Image from "next/image"

export interface AvatarMetadata {
  hash: string | null
  sizes: Record<string, string>
  mime_preferred: string
  baseUrl: string | null
}

interface AvatarProps {
  photoProfilMetadata?: AvatarMetadata | null
  initials: string
  name?: string
  size?: 40 | 80 | 160
  className?: string
  priority?: boolean
}

// Fonction pour générer un gradient déterministe basé sur les initiales
function generateGradient(initials: string): string {
  // Générer une couleur basée sur les initiales pour un gradient cohérent
  let hash = 0
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Générer des couleurs HSL basées sur le hash
  const hue = Math.abs(hash) % 360
  const saturation = 60 + (Math.abs(hash) % 20) // Entre 60% et 80%
  const lightness = 45 + (Math.abs(hash) % 15) // Entre 45% et 60%
  
  return `linear-gradient(to bottom right, hsl(${hue}, ${saturation}%, ${lightness}%), hsl(${hue}, ${saturation}%, ${lightness - 10}%))`
}

export function Avatar({
  photoProfilMetadata,
  initials,
  name,
  size = 40,
  className = "",
  priority = false,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const displayInitials = initials || "??"
  
  // Déterminer l'URL de l'image à utiliser
  const imageUrl = useMemo(() => {
    if (!photoProfilMetadata || imageError) {
      if (process.env.NODE_ENV === 'development' && !imageError) {
        console.debug('[Avatar] No photoProfilMetadata or imageError:', { 
          hasMetadata: !!photoProfilMetadata, 
          imageError 
        });
      }
      return null
    }
    
    // Si on a des dérivés, utiliser celui de la taille appropriée
    if (photoProfilMetadata.sizes && Object.keys(photoProfilMetadata.sizes).length > 0) {
      // Chercher la taille la plus proche disponible
      const availableSizes = Object.keys(photoProfilMetadata.sizes)
        .map(Number)
        .sort((a, b) => a - b)
      
      // Trouver la taille la plus proche >= à la taille demandée, ou la plus grande disponible
      let targetSize = availableSizes.find(s => s >= size) || availableSizes[availableSizes.length - 1]
      
      if (targetSize && photoProfilMetadata.sizes[targetSize.toString()]) {
        const url = photoProfilMetadata.sizes[targetSize.toString()]
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Avatar] Using derived size:', { targetSize, url, availableSizes });
        }
        return url
      }
    }
    
    // Fallback sur l'URL de base si pas de dérivés
    const fallbackUrl = photoProfilMetadata.baseUrl || null
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Avatar] Using fallback baseUrl:', { 
        fallbackUrl, 
        hasSizes: !!photoProfilMetadata.sizes,
        sizesKeys: photoProfilMetadata.sizes ? Object.keys(photoProfilMetadata.sizes) : []
      });
    }
    return fallbackUrl
  }, [photoProfilMetadata, size, imageError])
  
  const hasPhoto = imageUrl && !imageError
  const gradient = useMemo(() => generateGradient(displayInitials), [displayInitials])
  
  // Construire le srcSet pour les différentes tailles
  const srcSet = useMemo(() => {
    if (!photoProfilMetadata?.sizes || Object.keys(photoProfilMetadata.sizes).length === 0) {
      return undefined
    }
    
    const sets: string[] = []
    if (photoProfilMetadata.sizes["40"]) {
      sets.push(`${photoProfilMetadata.sizes["40"]} 1x`)
    }
    if (photoProfilMetadata.sizes["80"]) {
      sets.push(`${photoProfilMetadata.sizes["80"]} 2x`)
    }
    
    return sets.length > 0 ? sets.join(", ") : undefined
  }, [photoProfilMetadata])
  
  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-background select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      title={name || "Artisan"}
    >
      {hasPhoto && imageUrl ? (
        <>
          {/* Image avec Next.js Image pour optimisation */}
          <Image
            src={imageUrl}
            alt={name ? `Photo de profil de ${name}` : "Photo de profil"}
            width={size}
            height={size}
            className="object-cover w-full h-full"
            style={{
              objectFit: "cover",
            }}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            srcSet={srcSet}
            sizes={`${size}px`}
            onError={() => {
              setImageError(true)
            }}
            // Next.js Image optimisera automatiquement les URLs Supabase grâce à la config dans next.config.mjs
          />
          {/* Overlay avec initiales pour visibilité */}
          <div
            className="absolute inset-0 flex items-center justify-center font-semibold text-xs uppercase z-10 pointer-events-none"
            style={{
              color: "#ffffff",
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
              background: "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.2) 100%)",
            }}
          >
            <span className="leading-none">{displayInitials}</span>
          </div>
        </>
      ) : (
        <>
          {/* Fallback avec gradient et initiales */}
          <div
            className="absolute inset-0 flex items-center justify-center font-semibold text-xs uppercase"
            style={{
              background: gradient,
              color: "hsl(var(--primary))",
            }}
          >
            <span className="leading-none">{displayInitials}</span>
          </div>
        </>
      )}
    </div>
  )
}

