/**
 * Calculate quest progress based on KPI values and targets
 * Progress is calculated as the average percentage completion of all KPIs with targets
 * 
 * @param kpis Array of KPIs with value and target fields
 * @returns Progress percentage (0-100, rounded to nearest integer)
 */
export function calculateQuestProgress(kpis: Array<{ value: number | null; target: number | null }>): number {
  if (!kpis || kpis.length === 0) {
    return 0;
  }

  // Filter KPIs that have valid targets (> 0)
  const kpisWithTargets = kpis.filter(
    (kpi) => kpi.target !== null && kpi.target !== undefined && kpi.target > 0
  );

  if (kpisWithTargets.length === 0) {
    return 0; // No targets set, progress is 0
  }

  // Calculate completion percentage for each KPI
  const percentages = kpisWithTargets.map((kpi) => {
    const value = kpi.value !== null && kpi.value !== undefined ? Number(kpi.value) : 0;
    const target = Number(kpi.target);
    
    if (target <= 0) return 0;
    
    // Calculate percentage, capped at 100%
    const percentage = (value / target) * 100;
    return Math.min(percentage, 100);
  });

  // Calculate average percentage
  const average = percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;
  
  // Round to nearest integer and clamp between 0 and 100
  return Math.round(Math.max(0, Math.min(100, average)));
}
