// ===== PAGE INTERVENTIONS ULTRA-OPTIMISÉE =====
// Version ultra-rapide pour PC faibles

"use client"

import { SimpleInterventions } from '@/components/SimpleOptimized';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InterventionsUltraPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Interventions Ultra-Optimisées
            <span className="text-sm text-gray-500">(PC i5 8th gen)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleInterventions />
        </CardContent>
      </Card>
    </div>
  );
}
