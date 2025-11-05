"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function RecentSales() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/01.png" alt="Avatar" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Jean Dupont</p>
          <p className="text-sm text-muted-foreground">
            Intervention #1234 - Plomberie
          </p>
        </div>
        <div className="ml-auto font-medium">+€450</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/02.png" alt="Avatar" />
          <AvatarFallback>ML</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Marie Laurent</p>
          <p className="text-sm text-muted-foreground">
            Intervention #1235 - Électricité
          </p>
        </div>
        <div className="ml-auto font-medium">+€320</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/03.png" alt="Avatar" />
          <AvatarFallback>PM</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Pierre Martin</p>
          <p className="text-sm text-muted-foreground">
            Intervention #1236 - Chauffage
          </p>
        </div>
        <div className="ml-auto font-medium">+€280</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/04.png" alt="Avatar" />
          <AvatarFallback>SD</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Sophie Dubois</p>
          <p className="text-sm text-muted-foreground">
            Intervention #1237 - Menuiserie
          </p>
        </div>
        <div className="ml-auto font-medium">+€520</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/05.png" alt="Avatar" />
          <AvatarFallback>LR</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Luc Robert</p>
          <p className="text-sm text-muted-foreground">
            Intervention #1238 - Carrelage
          </p>
        </div>
        <div className="ml-auto font-medium">+€380</div>
      </div>
    </div>
  )
}
