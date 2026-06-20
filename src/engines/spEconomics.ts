// Module I — Story Point Economics (deterministic)
import { round } from '../utils';

export interface SpEconomics {
  revenuePerSp: number;
  costPerSp: number;
  profitPerSp: number;
  marginPerSpPct: number;
}

export function spEconomics(totalPrice: number, costToDeliver: number, storyPoints: number): SpEconomics {
  if (storyPoints <= 0) return { revenuePerSp: 0, costPerSp: 0, profitPerSp: 0, marginPerSpPct: 0 };
  const revenuePerSp = totalPrice / storyPoints;
  const costPerSp = costToDeliver / storyPoints;
  const profitPerSp = revenuePerSp - costPerSp;
  return {
    revenuePerSp: round(revenuePerSp),
    costPerSp: round(costPerSp),
    profitPerSp: round(profitPerSp),
    marginPerSpPct: revenuePerSp > 0 ? profitPerSp / revenuePerSp : 0,
  };
}

/** Express SP economics in man-hours using a team-specific SP→hours conversion (FR-I2). */
export function spToManHours(storyPoints: number, spToHours: number): number {
  return storyPoints * spToHours;
}
