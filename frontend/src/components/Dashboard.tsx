import React, { useState, useEffect } from 'react';
import { FilterPanel, type FilterState } from './FilterPanel';
import { HeatmapGrid } from './HeatmapGrid';
import { TopXPanel } from './TopXPanel';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { fetchComparisonData, fetchTopHeroes, type ComparisonData, type HeroStat } from '@/lib/api';
import { filterHeroesByRole, type HeroRole } from '@/lib/heroRoles';

const ROLES: Array<HeroRole | 'All'> = ['All', 'Tank', 'Damage', 'Support'];
const METRICS: Array<{ value: 'pick_rate' | 'win_rate'; label: string }> = [
  { value: 'pick_rate', label: 'Pick Rate' },
  { value: 'win_rate', label: 'Win Rate' }
];

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    mode: 'competitive',
    tier: 'All',
    region: 'Americas',
    input: 'PC',
    map: 'all-maps'
  });

  const [selectedRole, setSelectedRole] = useState<HeroRole | 'All'>('All');
  const [selectedMetric, setSelectedMetric] = useState<'pick_rate' | 'win_rate'>('pick_rate');
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [topPickRate, setTopPickRate] = useState<HeroStat[]>([]);
  const [topWinRate, setTopWinRate] = useState<HeroStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const loadData = async () => {
    setFadeOut(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setIsLoading(true);
    try {
      const [comparison, pickRate, winRate] = await Promise.all([
        fetchComparisonData(filters),
        fetchTopHeroes({ ...filters, metric: 'pick_rate', limit: 10 }),
        fetchTopHeroes({ ...filters, metric: 'win_rate', limit: 10 })
      ]);

      setComparisonData(comparison);
      setTopPickRate(pickRate.top);
      setTopWinRate(winRate.top);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
      setFadeOut(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const filteredComparison = filterHeroesByRole(comparisonData, selectedRole);
  const filteredPickRate = filterHeroesByRole(topPickRate, selectedRole);
  const filteredWinRate = filterHeroesByRole(topWinRate, selectedRole);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Overwatch 2 Statistics Dashboard</h1>
          <p className="text-muted-foreground">Track hero performance across patches</p>
        </div>

        <FilterPanel
          filters={filters}
          onFilterChange={setFilters}
        />

        <div className="flex gap-4 justify-center flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => {
                const currentIndex = ROLES.indexOf(selectedRole);
                const nextIndex = (currentIndex + 1) % ROLES.length;
                setSelectedRole(ROLES[nextIndex]);
              }}
              className="px-4 py-2 rounded-md font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Role: {selectedRole}
            </button>
          </div>
          
          <div className="flex gap-2">
            {METRICS.map(metric => (
              <button
                key={metric.value}
                onClick={() => setSelectedMetric(metric.value)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedMetric === metric.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`transition-opacity duration-200 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-muted-foreground">Loading data...</div>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedMetric === 'pick_rate' ? 'Pick Rate' : 'Win Rate'} Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HeatmapGrid data={filteredComparison} metric={selectedMetric} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <TopXPanel
                  title="Top 10 Pick Rate"
                  heroes={filteredPickRate}
                  metric="pick_rate"
                />
                <TopXPanel
                  title="Top 10 Win Rate"
                  heroes={filteredWinRate}
                  metric="win_rate"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
