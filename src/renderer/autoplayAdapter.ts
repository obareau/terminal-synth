// Dynamic autoplay parameter scaling based on music analysis
import type { MusicAnalysis } from "./musicAnalyzer";

export interface AutoplayPreset {
  minMeasures: number;
  maxMeasures: number;
  effectChangeProb: number;
  perturbatorChangeProb: number;
  driftSpeed: number;
  crossfadeDuration: number;
  bassReactivity: number;
}

export class AutoplayAdapter {
  static adaptPreset(basePreset: AutoplayPreset, analysis: MusicAnalysis): AutoplayPreset {
    try {
      const energyMultiplier = 0.5 + analysis.energy;

      // Style modifiers
      const styleModifiers: Record<string, number> = {
        calm: 0.6,
        driving: 0.9,
        chaotic: 1.3,
        peak: 1.5,
      };
      const styleModifier = styleModifiers[analysis.style] ?? 1.0;

      // Trend multiplier (ascending = faster changes, descending = slower)
      const trendMultiplier = 1.0 + analysis.energyTrend * 0.3;

      return {
        // Inverse energy: high energy = shorter measures for faster changes
        minMeasures: Math.max(2, Math.round(basePreset.minMeasures / energyMultiplier)),
        maxMeasures: Math.max(4, Math.round(basePreset.maxMeasures / energyMultiplier)),

        // More frequent effect changes at high energy
        effectChangeProb: Math.min(0.95, basePreset.effectChangeProb * energyMultiplier * styleModifier),

        // More frequent perturbator changes at high energy
        perturbatorChangeProb: Math.min(0.95, basePreset.perturbatorChangeProb * energyMultiplier * styleModifier),

        // Faster drift at high energy
        driftSpeed: basePreset.driftSpeed * energyMultiplier * styleModifier,

        // Shorter crossfades at high energy (snappier transitions)
        crossfadeDuration: Math.max(50, basePreset.crossfadeDuration / energyMultiplier),

        // More bass reactivity at high spectral change
        bassReactivity: Math.min(1, basePreset.bassReactivity + analysis.spectralChange * 0.3),
      };
    } catch (err) {
      console.error("[AutoplayAdapter] Error:", err);
      return basePreset;
    }
  }
}
