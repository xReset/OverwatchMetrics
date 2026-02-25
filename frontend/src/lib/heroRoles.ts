export type HeroRole = 'Tank' | 'Damage' | 'Support';

export const HERO_ROLES: Record<string, HeroRole> = {
  // Tanks (13 total)
  'dva': 'Tank',
  'domina': 'Tank',
  'doomfist': 'Tank',
  'hazard': 'Tank',
  'junker-queen': 'Tank',
  'mauga': 'Tank',
  'orisa': 'Tank',
  'ramattra': 'Tank',
  'reinhardt': 'Tank',
  'roadhog': 'Tank',
  'sigma': 'Tank',
  'winston': 'Tank',
  'wrecking-ball': 'Tank',
  'zarya': 'Tank',

  // Damage (23 total)
  'anran': 'Damage',
  'ashe': 'Damage',
  'bastion': 'Damage',
  'cassidy': 'Damage',
  'echo': 'Damage',
  'emre': 'Damage',
  'freja': 'Damage',
  'genji': 'Damage',
  'hanzo': 'Damage',
  'junkrat': 'Damage',
  'mei': 'Damage',
  'pharah': 'Damage',
  'reaper': 'Damage',
  'sojourn': 'Damage',
  'soldier-76': 'Damage',
  'sombra': 'Damage',
  'symmetra': 'Damage',
  'torbjorn': 'Damage',
  'tracer': 'Damage',
  'vendetta': 'Damage',
  'venture': 'Damage',
  'widowmaker': 'Damage',

  // Support (14 total)
  'ana': 'Support',
  'baptiste': 'Support',
  'brigitte': 'Support',
  'illari': 'Support',
  'jetpack-cat': 'Support',
  'juno': 'Support',
  'kiriko': 'Support',
  'lifeweaver': 'Support',
  'lucio': 'Support',
  'mercy': 'Support',
  'mizuki': 'Support',
  'moira': 'Support',
  'wuyang': 'Support',
  'zenyatta': 'Support'
};

export function getHeroRole(hero: string): HeroRole | null {
  return HERO_ROLES[hero] || null;
}

export function filterHeroesByRole(heroes: any[], role: HeroRole | 'All'): any[] {
  if (role === 'All') {
    return heroes;
  }
  return heroes.filter(hero => getHeroRole(hero.hero) === role);
}
