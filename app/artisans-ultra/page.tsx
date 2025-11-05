// ===== PAGE ARTISANS ULTRA-OPTIMISÉE =====
// Version ultra-rapide pour PC faibles

"use client"

import { SimpleArtisans } from '@/components/SimpleOptimized';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ArtisansUltraPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Artisans Ultra-Optimisés
            <span className="text-sm text-gray-500">(PC i5 8th gen)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleArtisans />
        </CardContent>
      </Card>
    </div>
  );
}
