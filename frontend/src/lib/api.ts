export interface Snapshot {
  timestamp: string;
  mode: string;
  input: string;
  region: string;
  tier: string;
  map?: string;
  heroes: HeroStat[];
}

export interface HeroStat {
  hero: string;
  pick_rate: number | null;
  win_rate: number | null;
}

export interface ComparisonData {
  hero: string;
  start: {
    pick_rate: number | null;
    win_rate: number | null;
    timestamp: string;
  } | null;
  end: {
    pick_rate: number | null;
    win_rate: number | null;
    timestamp: string;
  } | null;
}

export interface TopHeroesData {
  top: HeroStat[];
  timestamp: string | null;
}

let cachedData: Snapshot[] | null = null;

async function loadStaticData(): Promise<Snapshot[]> {
  if (cachedData) {
    console.log('[API] Using cached data:', cachedData.length, 'snapshots');
    return cachedData;
  }
  
  console.log('[API] Loading data from /data/overwatch-stats.json');
  const response = await fetch('/data/overwatch-stats.json');
  if (!response.ok) {
    throw new Error('Failed to load statistics data');
  }
  const data: Snapshot[] = await response.json();
  console.log('[API] Loaded', data.length, 'snapshots');
  console.log('[API] Available maps:', [...new Set(data.map(s => s.map))].sort());
  cachedData = data;
  return data;
}

function findMatchingSnapshot(snapshots: Snapshot[], params: {
  mode: string;
  input: string;
  region: string;
  tier: string;
  map?: string;
}): Snapshot | null {
  console.log('[API] Finding snapshot with params:', params);
  
  const matched = snapshots.find(s => 
    s.mode === params.mode &&
    s.input === params.input &&
    s.region === params.region &&
    s.tier === params.tier &&
    (!params.map || s.map === params.map)
  );
  
  if (matched) {
    console.log('[API] Found matching snapshot:', {
      map: matched.map,
      timestamp: matched.timestamp,
      heroCount: matched.heroes.length
    });
  } else {
    console.warn('[API] No match found, using fallback:', snapshots[0]?.map);
  }
  
  return matched || snapshots[0];
}

export async function fetchComparisonData(params: {
  mode: string;
  input: string;
  region: string;
  tier: string;
  map?: string;
}): Promise<ComparisonData[]> {
  const snapshots = await loadStaticData();
  const snapshot = findMatchingSnapshot(snapshots, params);
  
  if (!snapshot) return [];

  return snapshot.heroes.map(hero => ({
    hero: hero.hero,
    start: {
      pick_rate: hero.pick_rate,
      win_rate: hero.win_rate,
      timestamp: snapshot.timestamp
    },
    end: {
      pick_rate: hero.pick_rate,
      win_rate: hero.win_rate,
      timestamp: snapshot.timestamp
    }
  }));
}

export async function fetchTopHeroes(params: {
  mode: string;
  input: string;
  region: string;
  tier: string;
  metric: 'pick_rate' | 'win_rate';
  limit?: number;
  map?: string;
}): Promise<TopHeroesData> {
  const snapshots = await loadStaticData();
  const snapshot = findMatchingSnapshot(snapshots, params);
  
  if (!snapshot) {
    return { top: [], timestamp: null };
  }

  const sorted = [...snapshot.heroes]
    .filter(h => h[params.metric] !== null)
    .sort((a, b) => (b[params.metric] || 0) - (a[params.metric] || 0))
    .slice(0, params.limit || 10);

  return {
    top: sorted,
    timestamp: snapshot.timestamp
  };
}
