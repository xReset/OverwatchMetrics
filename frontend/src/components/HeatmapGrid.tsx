import React, { useState, useMemo } from 'react';
import type { ComparisonData } from '@/lib/api';
import { formatHeroName } from '@/lib/utils';
import { getHeroRole } from '@/lib/heroRoles';
import { getHeroPortrait } from '@/lib/heroPortraits';

interface HeatmapGridProps {
  data: ComparisonData[];
  metric: 'pick_rate' | 'win_rate';
}

type SortColumn = 'hero' | 'role' | 'current' | 'change';
type SortDirection = 'asc' | 'desc';

export function HeatmapGrid({ data, metric }: HeatmapGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('current');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const rowsPerPage = 20;

  const processedData = useMemo(() => {
    return data
      .filter(item => {
        const startValue = item.start?.[metric];
        const endValue = item.end?.[metric];
        return startValue !== null && startValue !== undefined && 
               endValue !== null && endValue !== undefined;
      })
      .map(item => {
        const current = item.end![metric]!;
        const previous = item.start![metric]!;
        const change = current - previous;
        const role = getHeroRole(item.hero);

        return {
          hero: item.hero,
          role: role || 'Unknown',
          current,
          previous,
          change
        };
      });
  }, [data, metric]);

  const filteredData = useMemo(() => {
    return processedData.filter(item => {
      const matchesSearch = item.hero.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || item.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [processedData, searchTerm, roleFilter]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let valA: any, valB: any;

      switch (sortColumn) {
        case 'hero':
          valA = a.hero.toLowerCase();
          valB = b.hero.toLowerCase();
          break;
        case 'role':
          valA = a.role;
          valB = b.role;
          break;
        case 'current':
          valA = a.current;
          valB = b.current;
          break;
        case 'change':
          valA = a.change;
          valB = b.change;
          break;
        default:
          return 0;
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return sorted;
  }, [filteredData, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (column: SortColumn) => {
    if (column === 'role') {
      // Cycle through role filters: null → Tank → Damage → Support → null
      if (roleFilter === null) {
        setRoleFilter('Tank');
      } else if (roleFilter === 'Tank') {
        setRoleFilter('Damage');
      } else if (roleFilter === 'Damage') {
        setRoleFilter('Support');
      } else {
        setRoleFilter(null);
      }
      setCurrentPage(1);
    } else {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('desc');
      }
      setCurrentPage(1);
    }
  };

  const getChangeClass = (change: number) => {
    if (change > 0.5) return 'bg-green-500/20 text-green-400';
    if (change < -0.5) return 'bg-red-500/20 text-red-400';
    return 'bg-muted/20 text-muted-foreground';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Tank': return 'bg-[#FAA81A]';
      case 'Damage': return 'bg-[#E3191C]';
      case 'Support': return 'bg-[#FEF06E]';
      default: return 'bg-muted';
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (column === 'role') {
      if (roleFilter === 'Tank') return <span className="text-primary ml-1">(Tank)</span>;
      if (roleFilter === 'Damage') return <span className="text-primary ml-1">(Damage)</span>;
      if (roleFilter === 'Support') return <span className="text-primary ml-1">(Support)</span>;
      return <span className="text-muted-foreground ml-1">(All)</span>;
    }
    if (sortColumn !== column) {
      return <span className="text-muted-foreground ml-1">↕</span>;
    }
    return sortDirection === 'asc' 
      ? <span className="text-primary ml-1">↑</span>
      : <span className="text-primary ml-1">↓</span>;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex gap-3 sm:gap-4">
        <input
          type="text"
          placeholder="Search heroes..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border -mx-3 sm:mx-0">
        <table className="w-full text-xs sm:text-sm min-w-[600px]">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th
                onClick={() => handleSort('hero')}
                className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold cursor-pointer hover:bg-muted/70 transition-colors select-none"
              >
                Hero{getSortIcon('hero')}
              </th>
              <th
                onClick={() => handleSort('role')}
                className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold cursor-pointer hover:bg-muted/70 transition-colors select-none"
              >
                Role{getSortIcon('role')}
              </th>
              <th
                onClick={() => handleSort('current')}
                className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold cursor-pointer hover:bg-muted/70 transition-colors select-none"
              >
                {metric === 'pick_rate' ? 'Pick Rate' : 'Win Rate'}{getSortIcon('current')}
              </th>
              <th
                onClick={() => handleSort('change')}
                className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold cursor-pointer hover:bg-muted/70 transition-colors select-none"
              >
                Change{getSortIcon('change')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr
                key={item.hero}
                className="border-b border-border hover:bg-accent/50 transition-colors"
              >
                <td className="px-2 sm:px-4 py-2 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3 font-medium">
                    {getHeroPortrait(item.hero) ? (
                      <img 
                        src={getHeroPortrait(item.hero)!} 
                        alt={formatHeroName(item.hero)}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-border flex-shrink-0"
                      />
                    ) : (
                      <span className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${getRoleColor(item.role)} flex-shrink-0`} />
                    )}
                    <span className="truncate">{formatHeroName(item.hero)}</span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground">
                  {item.role}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">
                  {item.current.toFixed(1)}%
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3">
                  <div className={`inline-block px-2 sm:px-3 py-1 rounded-md font-semibold text-xs sm:text-sm ${getChangeClass(item.change)}`}>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 sm:gap-2 flex-wrap">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-colors ${
                currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      <div className="flex justify-center gap-4 sm:gap-6 text-xs sm:text-sm flex-wrap px-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <img src={getHeroPortrait('reinhardt')!} alt="Tank" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background" />
            <img src={getHeroPortrait('dva')!} alt="Tank" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background" />
          </div>
          <span className="text-muted-foreground">Tank</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <img src={getHeroPortrait('tracer')!} alt="Damage" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background" />
            <img src={getHeroPortrait('genji')!} alt="Damage" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background" />
          </div>
          <span className="text-muted-foreground">Damage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <img src={getHeroPortrait('mercy')!} alt="Support" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background" />
            <img src={getHeroPortrait('ana')!} alt="Support" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background" />
          </div>
          <span className="text-muted-foreground">Support</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 sm:w-16 h-3 sm:h-4 rounded" style={{ background: 'linear-gradient(to right, rgba(239, 68, 68, 0.4), rgba(148, 163, 184, 0.2), rgba(34, 197, 94, 0.4))' }} />
          <span className="text-muted-foreground">Change</span>
        </div>
      </div>
    </div>
  );
}
