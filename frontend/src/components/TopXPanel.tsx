import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import type { HeroStat } from '@/lib/api';
import { formatHeroName, formatPercentage } from '@/lib/utils';

interface TopXPanelProps {
  title: string;
  heroes: HeroStat[];
  metric: 'pick_rate' | 'win_rate';
  onHeroClick?: (hero: string) => void;
}

export function TopXPanel({ title, heroes, metric, onHeroClick }: TopXPanelProps) {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {heroes.map((hero, index) => {
            const value = hero[metric];
            return (
              <div
                key={hero.hero}
                className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onHeroClick?.(hero.hero)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <span className="font-medium">{formatHeroName(hero.hero)}</span>
                </div>
                <span className="font-semibold text-primary">
                  {formatPercentage(value)}
                </span>
              </div>
            );
          })}
          {heroes.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
