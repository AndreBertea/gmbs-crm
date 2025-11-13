"use client"

import { TextColumnFilter } from "./TextColumnFilter"
import { DateColumnFilter } from "./DateColumnFilter"
import { SelectColumnFilter } from "./SelectColumnFilter"
import { NumberColumnFilter } from "./NumberColumnFilter"
import { CheckboxColumnFilter } from "./CheckboxColumnFilter"
import { UserColumnFilter } from "./UserColumnFilter"
import type { ColumnFilterProps } from "./types"

export function ColumnFilter(props: ColumnFilterProps) {
  const { schema } = props

  switch (schema.type) {
    case "text":
      return <TextColumnFilter {...props} />
    case "date":
      return <DateColumnFilter {...props} />
    case "select":
    case "multi_select":
      return <SelectColumnFilter {...props} />
    case "number":
      return <NumberColumnFilter {...props} />
    case "checkbox":
      return <CheckboxColumnFilter {...props} />
    case "user":
      return <UserColumnFilter {...props} />
    default:
      // Fallback vers TextColumnFilter pour les types non reconnus
      return <TextColumnFilter {...props} />
  }
}

