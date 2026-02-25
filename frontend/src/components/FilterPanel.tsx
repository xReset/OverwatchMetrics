import React, { useEffect } from 'react';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

export interface FilterState {
  mode: string;
  tier: string;
  region: string;
  input: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onAdvancedClick: () => void;
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

export function FilterPanel({ filters, onFilterChange, onAdvancedClick }: FilterPanelProps) {
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
    <div className="flex flex-wrap gap-4 items-center justify-between p-6 bg-card rounded-lg border">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">Mode</label>
          <Select
            value={filters.mode}
            onChange={(e) => handleChange('mode', e.target.value)}
          >
            {MODES.map(mode => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">Tier</label>
          <Select
            value={filters.tier}
            onChange={(e) => handleChange('tier', e.target.value)}
          >
            {TIERS.map(tier => (
              <option key={tier.value} value={tier.value}>{tier.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">Region</label>
          <Select
            value={filters.region}
            onChange={(e) => handleChange('region', e.target.value)}
          >
            {REGIONS.map(region => (
              <option key={region.value} value={region.value}>{region.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">Input</label>
          <Select
            value={filters.input}
            onChange={(e) => handleChange('input', e.target.value)}
          >
            {INPUTS.map(input => (
              <option key={input.value} value={input.value}>{input.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <Button variant="outline" onClick={onAdvancedClick}>
        Advanced →
      </Button>
    </div>
  );
}
