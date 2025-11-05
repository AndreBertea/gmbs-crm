"use client"

import { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useModalState } from "./useModalState"
import type { ModalContent, ModalOpenOptions } from "@/types/modal"

const VALID_CONTENT: ModalContent[] = ["intervention", "chat", "artisan", "new-intervention"]

const MODAL_PARAM = "i"
const CONTENT_PARAM = "mc"
const LEGACY_MODAL_PARAM = "modal"
const LEGACY_CONTENT_PARAM = "modalContent"

let closingGuardId: string | null = null
let pendingModalId: string | null = null

const isValidContent = (value: string | null): value is ModalContent => {
  if (!value) return false
  return (VALID_CONTENT as string[]).includes(value)
}

const buildUrl = (params: URLSearchParams) => {
  const query = params.toString()
  return query ? `${window.location.pathname}?${query}` : window.location.pathname
}

export function useModal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const isOpen = useModalState((state) => state.isOpen)
  const activeId = useModalState((state) => state.activeId)
  const activeIndex = useModalState((state) => state.activeIndex)
  const orderedIds = useModalState((state) => state.orderedIds)
  const sourceLayoutId = useModalState((state) => state.sourceLayoutId)
  const overrideMode = useModalState((state) => state.overrideMode)
  const content = useModalState((state) => state.content)
  const context = useModalState((state) => state.context)
  const metadata = useModalState((state) => state.metadata)

  const setIsOpen = useModalState((state) => state.setIsOpen)
  const setActiveId = useModalState((state) => state.setActiveId)
  const setActiveIndex = useModalState((state) => state.setActiveIndex)
  const setOrderedIds = useModalState((state) => state.setOrderedIds)
  const setSourceLayoutId = useModalState((state) => state.setSourceLayoutId)
  const setOverrideMode = useModalState((state) => state.setOverrideMode)
  const setContent = useModalState((state) => state.setContent)
  const setContext = useModalState((state) => state.setContext)
  const setMetadata = useModalState((state) => state.setMetadata)
  const reset = useModalState((state) => state.reset)

  const open = useCallback(
    (id: string, options?: ModalOpenOptions) => {
      closingGuardId = null
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      const modalContent: ModalContent = options?.content && isValidContent(options.content) ? options.content : "intervention"

      params.delete(LEGACY_MODAL_PARAM)
      params.delete(LEGACY_CONTENT_PARAM)
      params.set(MODAL_PARAM, id)
      if (modalContent !== "intervention") {
        params.set(CONTENT_PARAM, modalContent)
      } else {
        params.delete(CONTENT_PARAM)
      }

      let nextIndex = -1
      const hasOrderedIds = Array.isArray(options?.orderedIds) && options.orderedIds.length > 0
      if (hasOrderedIds) {
        const ids = options!.orderedIds!
        nextIndex = options?.index ?? Math.max(0, ids.indexOf(id))
        setOrderedIds(ids)
      } else {
        setOrderedIds([])
        if (typeof options?.index === "number") {
          nextIndex = options.index
        }
      }

      setActiveIndex(nextIndex)
      setActiveId(id)
      setSourceLayoutId(options?.layoutId ?? null)
      setOverrideMode(options?.modeOverride ?? null)
      setContent(modalContent)
      setContext(options?.context ?? null)
      setMetadata(options?.origin ? { origin: options.origin } : null)
      setIsOpen(true)
      pendingModalId = id

      if (typeof window !== "undefined") {
        const url = buildUrl(params)
        router.push(url, { scroll: false })
      }
    },
    [
      router,
      searchParams,
      setActiveId,
      setActiveIndex,
      setContent,
      setContext,
      setIsOpen,
      setMetadata,
      setOrderedIds,
      setOverrideMode,
      setSourceLayoutId,
    ],
  )

  const close = useCallback(() => {
    // Guard: only close if actually open
    if (!isOpen) return

    const closingId =
      searchParams?.get(MODAL_PARAM) ??
      searchParams?.get(LEGACY_MODAL_PARAM) ??
      activeId ??
      null
    closingGuardId = closingId
    pendingModalId = null

    reset()
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    params.delete(MODAL_PARAM)
    params.delete(CONTENT_PARAM)
    params.delete(LEGACY_MODAL_PARAM)
    params.delete(LEGACY_CONTENT_PARAM)

    if (typeof window !== "undefined") {
      const url = buildUrl(params)
      router.replace(url, { scroll: false })
    }
  }, [activeId, isOpen, reset, router, searchParams])

  useEffect(() => {
    if (typeof window === "undefined") return

    const modalId = searchParams?.get(MODAL_PARAM)
    const legacyModalId = searchParams?.get(LEGACY_MODAL_PARAM)
    const needsMigration = !modalId && Boolean(legacyModalId)

    if (needsMigration && legacyModalId) {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      params.set(MODAL_PARAM, legacyModalId)
      params.delete(LEGACY_MODAL_PARAM)

      const legacyContent = params.get(LEGACY_CONTENT_PARAM)
      if (legacyContent) {
        params.set(CONTENT_PARAM, legacyContent)
        params.delete(LEGACY_CONTENT_PARAM)
      }

      router.replace(buildUrl(params), { scroll: false })
      return
    }

    const rawContent = searchParams?.get(CONTENT_PARAM) ?? searchParams?.get(LEGACY_CONTENT_PARAM)

    if (!modalId) {
      if (closingGuardId) {
        closingGuardId = null
      }
      if (!pendingModalId && isOpen) {
        reset()
      }
      return
    }

    if (pendingModalId && modalId !== pendingModalId) {
      return
    }

    if (closingGuardId && closingGuardId === modalId) {
      return
    }

    if (closingGuardId) {
      closingGuardId = null
    }

    if (pendingModalId) {
      pendingModalId = null
    }

    const nextContent: ModalContent = isValidContent(rawContent) ? rawContent : "intervention"
    if (activeId !== modalId) {
      setActiveId(modalId)
    }
    if (content !== nextContent) {
      setContent(nextContent)
    }
    if (!isOpen) {
      setIsOpen(true)
    }
  }, [
    activeId,
    content,
    isOpen,
    reset,
    router,
    searchParams,
    setActiveId,
    setContent,
    setIsOpen,
  ])

  return {
    isOpen,
    activeId,
    activeIndex,
    orderedIds,
    sourceLayoutId,
    overrideMode,
    content,
    context,
    metadata,
    open,
    close,
  }
}

export default useModal
