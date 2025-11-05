"use client"

import { memo } from "react"
import type { ReactNode } from "react"

const baseRect = {
  stroke: "currentColor",
  strokeWidth: 1,
  fill: "none",
}

const overlayRect = {
  stroke: "currentColor",
  strokeWidth: 1,
  fill: "currentColor",
  opacity: 0.1,
  rx: 1,
}

const Svg = ({ children, className }: { children: ReactNode; className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false" className={className}>
    <rect x="2.5" y="2.5" width="13" height="13" {...baseRect} />
    {children}
  </svg>
)

export const HalfPageIcon = memo(({ className }: { className?: string }) => (
  <Svg className={className}>
    <rect x="10.5" y="2.5" width="5" height="13" {...overlayRect} />
  </Svg>
))

export const CenterPageIcon = memo(({ className }: { className?: string }) => (
  <Svg className={className}>
    <rect x="5.5" y="5.5" width="7" height="7" {...overlayRect} />
  </Svg>
))

export const FullPageIcon = memo(({ className }: { className?: string }) => (
  <Svg className={className}>
    <rect x="2.5" y="2.5" width="13" height="13" {...overlayRect} />
  </Svg>
))

HalfPageIcon.displayName = "HalfPageIcon"
CenterPageIcon.displayName = "CenterPageIcon"
FullPageIcon.displayName = "FullPageIcon"

export const ModeIcons = {
  halfpage: HalfPageIcon,
  centerpage: CenterPageIcon,
  fullpage: FullPageIcon,
} as const