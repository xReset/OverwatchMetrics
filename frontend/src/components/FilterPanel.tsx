import React, { useEffect } from 'react';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

export interface FilterState {
  mode: string;
  tier: string;
  region: string;
  input: string;
  map: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const MODES = [
  { value: 'competitive', label: 'Competitive' },
  { value: 'quick-play', label: 'Quick Play' }
];

const TIERS = [
  { value: 'All', label: 'All Ranks' },
  { value: 'Bronze', label: 'Bronze' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Platinum', label: 'Platinum' },
  { value: 'Diamond', label: 'Diamond' },
  { value: 'Master', label: 'Master' },
  { value: 'Grandmaster', label: 'Grandmaster' }
];

const REGIONS = [
  { value: 'Americas', label: 'Americas' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' }
];

const INPUTS = [
  { value: 'PC', label: 'PC' },
  { value: 'Console', label: 'Console' }
];

const MAPS = [
  { value: 'all-maps', label: 'All Maps' },
  { value: 'busan', label: 'Busan' },
  { value: 'ilios', label: 'Ilios' },
  { value: 'lijiang-tower', label: 'Lijiang Tower' },
  { value: 'nepal', label: 'Nepal' },
  { value: 'oasis', label: 'Oasis' },
  { value: 'antarctic-peninsula', label: 'Antarctic Peninsula' },
  { value: 'samoa', label: 'Samoa' },
  { value: 'dorado', label: 'Dorado' },
  { value: 'havana', label: 'Havana' },
  { value: 'junkertown', label: 'Junkertown' },
  { value: 'rialto', label: 'Rialto' },
  { value: 'route-66', label: 'Route 66' },
  { value: 'shambali-monastery', label: 'Shambali Monastery' },
  { value: 'circuit-royal', label: 'Circuit Royal' },
  { value: 'blizzard-world', label: 'Blizzard World' },
  { value: 'eichenwalde', label: 'Eichenwalde' },
  { value: 'hollywood', label: 'Hollywood' },
  { value: 'kings-row', label: "King's Row" },
  { value: 'midtown', label: 'Midtown' },
  { value: 'numbani', label: 'Numbani' },
  { value: 'paraiso', label: 'Paraíso' },
  { value: 'colosseo', label: 'Colosseo' },
  { value: 'esperanca', label: 'Esperança' },
  { value: 'new-queen-street', label: 'New Queen Street' },
  { value: 'runasapi', label: 'Runasapi' },
  { value: 'new-junk-city', label: 'New Junk City' },
  { value: 'suravasa', label: 'Suravasa' }
];

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('ow-filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        onFilterChange(parsed);
      } catch (e) {
        console.error('Failed to parse saved filters');
      }
    }
  }, [onFilterChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('ow-filters', JSON.stringify(filters));
  }, [filters]);

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-between p-4 sm:p-6 bg-card rounded-lg border">
      <div className="flex flex-wrap gap-3 sm:gap-4 items-center w-full">
        <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Mode</label>
          <Select
            value={filters.mode}
            onChange={(e) => handleChange('mode', e.target.value)}
          >
            {MODES.map(mode => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Tier</label>
          <Select
            value={filters.tier}
            onChange={(e) => handleChange('tier', e.target.value)}
          >
            {TIERS.map(tier => (
              <option key={tier.value} value={tier.value}>{tier.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Region</label>
          <Select
            value={filters.region}
            onChange={(e) => handleChange('region', e.target.value)}
          >
            {REGIONS.map(region => (
              <option key={region.value} value={region.value}>{region.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Input</label>
          <Select
            value={filters.input}
            onChange={(e) => handleChange('input', e.target.value)}
          >
            {INPUTS.map(input => (
              <option key={input.value} value={input.value}>{input.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px] flex-1 sm:flex-initial">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Map</label>
          <Select
            value={filters.map}
            onChange={(e) => handleChange('map', e.target.value)}
          >
            {MAPS.map(map => (
              <option key={map.value} value={map.value}>{map.label}</option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
