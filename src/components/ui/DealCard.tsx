import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar,
  Euro,
  User,
  FileText,
  Plus
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Interface compatible avec l'ancien rendu
export interface LegacyDealCardProps {
  deal: {
    id: string
    dealName: string
    client: string
    stage: string
    value: number
    probability: number
    owner: string
    ownerAvatar: string
    expectedClose: string
    description: string
    createdAt: string
  }
  onEdit: (deal: any) => void
  onSendEmail: () => void
  onCall: () => void
  onAddDocument: () => void
  onCreateTask?: () => void
  onStatusChange: (deal: any, status: string) => void
  onAmountChange: (deal: any, amount: number) => void
  onDateChange: (deal: any, field: string, date: string) => void
  onClientChange: (deal: any, client: string) => void
  onDescriptionChange: (deal: any, description: string) => void
  onOwnerChange: (deal: any, owner: string) => void
}

const getStageColor = (stage: string) => {
  const colors = {
    "Lead": "bg-gray-100 text-gray-800",
    "Qualified": "bg-blue-100 text-blue-800",
    "Proposal": "bg-yellow-100 text-yellow-800",
    "Negotiation": "bg-orange-100 text-orange-800",
    "Closed Won": "bg-green-100 text-green-800",
    "Closed Lost": "bg-red-100 text-red-800",
  }
  return colors[stage as keyof typeof colors] ?? "bg-gray-100 text-gray-800"
}

export default function DealCard({
  deal,
  onEdit,
  onSendEmail,
  onCall,
  onAddDocument,
  onCreateTask,
  onStatusChange,
  onAmountChange,
  onDateChange,
  onClientChange,
  onDescriptionChange,
  onOwnerChange,
}: LegacyDealCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle 
              className="text-lg cursor-pointer hover:text-primary"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {deal.dealName}
            </CardTitle>
            <CardDescription className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              {deal.client}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(deal)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Envoyer email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCall}>
                <Phone className="mr-2 h-4 w-4" />
                Appeler
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddDocument}>
                <FileText className="mr-2 h-4 w-4" />
                Ajouter document
              </DropdownMenuItem>
              {onCreateTask && (
                <DropdownMenuItem onClick={onCreateTask}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer tâche
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge className={getStageColor(deal.stage)}>{deal.stage}</Badge>
          <span className="text-sm text-muted-foreground">{deal.probability}%</span>
        </div>
        <div className="text-2xl font-bold">€{deal.value.toLocaleString("fr-FR")}</div>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={deal.ownerAvatar || "/placeholder.svg"} className="object-cover" />
            <AvatarFallback className="text-xs">
              {deal.owner.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{deal.owner}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <Calendar className="inline h-3 w-3 mr-1" />
          {new Date(deal.expectedClose).toLocaleDateString("fr-FR")}
        </div>
        
        {isExpanded && (
          <div className="pt-4 border-t space-y-3">
            <div className="text-sm">
              <strong>Description:</strong> {deal.description}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onSendEmail}>
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
              <Button size="sm" variant="outline" onClick={onCall}>
                <Phone className="h-3 w-3 mr-1" />
                Appel
              </Button>
              {onCreateTask && (
                <Button size="sm" variant="outline" onClick={onCreateTask}>
                  <Plus className="h-3 w-3 mr-1" />
                  Tâche
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
