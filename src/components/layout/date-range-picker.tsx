"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

export function CalendarDateRangePicker() {
  return (
    <Button variant="outline" className="justify-start text-left font-normal">
      <Calendar className="mr-2 h-4 w-4" />
      <span>Période</span>
    </Button>
  )
}
