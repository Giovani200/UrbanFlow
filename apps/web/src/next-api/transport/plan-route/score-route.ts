import type { Route } from "../types";

type Weights = {
  weightCarbon: number;
  weightTime: number;
  weightCost: number;
};

function normalize(value: number, worst: number): number {
  if (worst === 0) return 100;
  return Math.round(((worst - value) / worst) * 100);
}

export function scoreRoute(routes: Route[], weights: Weights): Route[] {
  if (routes.length === 0) return [];

  const worstCarbon = Math.max(...routes.map((r) => r.totalCarbon));
  const worstTime = Math.max(...routes.map((r) => r.totalDuration));
  const worstDist = Math.max(...routes.map((r) => r.totalDistance));

  const totalWeight = weights.weightCarbon + weights.weightTime + weights.weightCost;

  const scored = routes.map((route) => {
    const carbonScore = normalize(route.totalCarbon, worstCarbon);
    const timeScore = normalize(route.totalDuration, worstTime);
    const costScore = normalize(route.totalDistance, worstDist);

    const score =
      totalWeight > 0
        ? Math.round(
            (weights.weightCarbon * carbonScore +
              weights.weightTime * timeScore +
              weights.weightCost * costScore) /
              totalWeight
          )
        : 50;

    return { ...route, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}
