"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"

export type UserStatus = "available" | "busy" | "do-not-disturb" | "be-right-back" | "appear-away" | "appear-offline"

interface UserStatusContextType {
  status: UserStatus
  setStatus: (status: UserStatus) => void
  lastActivity: Date
  updateActivity: () => void
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined)

export function UserStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatusState] = useState<UserStatus>("available")
  const [lastActivity, setLastActivity] = useState(new Date())
  const router = useRouter()

  const updateActivity = useCallback(() => {
    setLastActivity(new Date())
    // If user was away, bring them back to available
    if (status === "appear-away") {
      setStatusState("available")
    }
  }, [status])

  const setStatus = (newStatus: UserStatus) => {
    // Don't allow manual setting of automatic statuses
    if (newStatus === "appear-away" || newStatus === "appear-offline") return

    setStatusState(newStatus)
    localStorage.setItem("userStatus", newStatus)
  }

  useEffect(() => {
    const savedStatus = localStorage.getItem("userStatus") as UserStatus
    if (savedStatus && savedStatus !== "appear-away" && savedStatus !== "appear-offline") {
      setStatusState(savedStatus)
    }
  }, [])

  useEffect(() => {
    const checkInactivity = () => {
      const now = new Date()
      const timeDiff = now.getTime() - lastActivity.getTime()
      const oneHour = 60 * 60 * 1000 // 1 hour in milliseconds

      if (timeDiff >= oneHour && status !== "appear-offline" && status !== "appear-away") {
        setStatusState("appear-away")
      }
    }

    const interval = setInterval(checkInactivity, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [lastActivity, status])

  useEffect(() => {
    const handleActivity = () => updateActivity()

    window.addEventListener("mousemove", handleActivity)
    window.addEventListener("keydown", handleActivity)
    window.addEventListener("click", handleActivity)
    window.addEventListener("scroll", handleActivity)

    return () => {
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      window.removeEventListener("click", handleActivity)
      window.removeEventListener("scroll", handleActivity)
    }
  }, [updateActivity])

  return (
    <UserStatusContext.Provider value={{ status, setStatus, lastActivity, updateActivity }}>
      {children}
    </UserStatusContext.Provider>
  )
}

export function useUserStatus() {
  const context = useContext(UserStatusContext)
  if (context === undefined) {
    throw new Error("useUserStatus must be used within a UserStatusProvider")
  }
  return context
}
