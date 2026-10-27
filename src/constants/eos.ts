// src/constants/eos.ts
// Jet-A / Jet-A1 distillation specification bands.
// Used by DistillationChart to overlay reference lines.
// Source: DEF STAN 91-091 / ASTM D1655

export const JETX_SPEC = {
  T10_max_C:  205,    // T10 ≤ 205°C
  T50_min_C:  150,    // T50 ≥ 150°C
  T50_max_C:  230,    // T50 ≤ 230°C
  T90_max_C:  300,    // T90 ≤ 300°C
  FBP_max_C:  300,    // FBP ≤ 300°C
}

// Typical EOS-computed distillation ranges for reference
export const EOS_DIST_GUIDELINES = {
  IBP_typical_range: [150, 175],
  T50_typical_range: [175, 210],
  FBP_typical_range: [250, 295],
}

// Scenario descriptions shown in the UI
export const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  'Balanced':
    'Equal weight on family composition, carbon mass, and carbon profile.',
  'Auto-Balanced':
    'Searches for the best weight combination using Dirichlet sampling (25 trials).',
  'Cmass Only':
    'Minimises carbon mass deviation only. Ignores family targets.',
  'Family Only':
    'Minimises family composition error (n/iso/cyclo/arom) only.',
  'Carbon Profile Only':
    'Minimises C6-C25 carbon distribution error only.',
  'Balanced (per-family)':
    'Like Balanced but matches per-family C6-C25 profiles (requires pf_targets).',
  'Auto-Balanced (per-family)':
    'Auto-balanced weight search using per-family profiles.',
  'Carbon Profile Only (per-family)':
    'Matches per-family C6-C25 profiles only.',
  'Minimize Aromatics':
    'Minimises aromatic content. Useful for smoke point optimisation.',
  'High Isoparaffins':
    'Forces isoparaffin content ≥ 80%. Requires a pool with high-iso substances.',
}
