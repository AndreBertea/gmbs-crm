"use client"

import * as React from "react"

// Lightweight CSS-only bubble background inspired by shadcn docs.
// Uses CSS variables --glass-c1/2/3 set by lib/themes.ts for palette.
// Scoped for performance: no full-screen blur, no nested filters.

export default function BubbleBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        // Several radial gradients positioned across the screen.
        backgroundImage: [
          "radial-gradient(600px circle at 20% 10%, var(--glass-c1, #8b5cf6) 0%, transparent 55%)",
          "radial-gradient(500px circle at 85% 15%, var(--glass-c2, #1e1b4b) 0%, transparent 60%)",
          "radial-gradient(500px circle at 50% 85%, var(--glass-c3, #4c1d95) 0%, transparent 60%)",
          "radial-gradient(420px circle at 15% 70%, var(--glass-c2, #1e1b4b) 0%, transparent 65%)",
          "radial-gradient(380px circle at 80% 75%, var(--glass-c1, #8b5cf6) 0%, transparent 65%)",
        ].join(", "),
        backgroundRepeat: "no-repeat",
        backgroundSize: "auto",
        // Gentle motion via background-position; disabled by reduced motion in CSS
        backgroundPosition: "0% 0%",
        animation: "gradient 16s ease-in-out infinite",
        filter: "blur(24px)",
        opacity: 0.7,
      }}
      data-animated-bg
    />
  )
}

