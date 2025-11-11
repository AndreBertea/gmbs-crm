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
  // Teinte : éviter les couleurs trop flashy (rose, vert fluo) en utilisant une plage plus restreinte
  // On utilise une plage de 200-320 degrés pour éviter les roses/verts trop flashy
  const hue = 200 + (Math.abs(hash) % 120) // Entre 200° et 320° (bleu, violet, bleu-vert doux)
  
  // Saturation réduite pour des couleurs plus douces et professionnelles
  const saturation = 30 + (Math.abs(hash) % 20) // Entre 30% et 50% (au lieu de 60-80%)
  
  // Luminosité augmentée pour des couleurs plus claires et moins agressives
  const lightness = 55 + (Math.abs(hash) % 15) // Entre 55% et 70% (au lieu de 45-60%)
  
  return `linear-gradient(to bottom right, hsl(${hue}, ${saturation}%, ${lightness}%), hsl(${hue}, ${saturation}%, ${lightness - 8}%))`
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
  
  // Calculer la couleur du texte selon la luminosité du fond pour un meilleur contraste
  // Pour les gradients, on utilise une couleur de texte qui contraste bien
  const textColor = useMemo(() => {
    // Pour les avatars avec photo, toujours blanc avec ombre prononcée
    if (hasPhoto) {
      return "#ffffff"
    }
    // Pour les avatars sans photo, utiliser une couleur qui contraste bien avec le gradient
    // Comme nos gradients sont maintenant plus clairs (lightness 55-70%), on utilise une couleur sombre
    return "#1f2937" // Gris très foncé pour bon contraste avec les fonds clairs
  }, [hasPhoto])
  
  // Ombre de texte plus prononcée pour meilleure lisibilité
  const textShadow = hasPhoto 
    ? "0 2px 4px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6)" // Double ombre pour photo
    : "0 1px 2px rgba(255, 255, 255, 0.8), 0 0 1px rgba(0, 0, 0, 0.3)" // Ombre subtile pour gradient
  
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
            sizes={`${size}px`}
            onError={() => {
              setImageError(true)
            }}
            // Next.js Image optimisera automatiquement les URLs Supabase et générera le srcSet automatiquement
          />
          {/* Overlay avec initiales pour visibilité */}
          <div
            className="absolute inset-0 flex items-center justify-center font-semibold text-xs uppercase z-10 pointer-events-none"
            style={{
              color: textColor,
              textShadow: textShadow,
              background: "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 100%)",
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
              color: textColor,
              textShadow: textShadow,
            }}
          >
            <span className="leading-none">{displayInitials}</span>
          </div>
        </>
      )}
    </div>
  )
}

