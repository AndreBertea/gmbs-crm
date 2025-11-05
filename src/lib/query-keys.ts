export const queryKeys = {
  interventions: () => ["interventions"] as const,
  intervention: (id: string) => ["intervention", id] as const,
} as const

export type QueryKey = ReturnType<(typeof queryKeys)[keyof typeof queryKeys]>
