// src/store/optimizerStore.ts
// Holds per-session UI state for the optimizer.
// Server data (run results, pool metadata) lives in TanStack Query — not here.
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { OptimizationResult } from '@/types'

export type SparsityMode = 'threshold' | 'fixed_n' | 'minimise_n'
export type FpBasis = 'mole' | 'mass'
export type MixingBehavior = 'Ideal' | 'Real'
export type Scenario =
  | 'Balanced'
  | 'Auto-Balanced'
  | 'Cmass Only'
  | 'Family Only'
  | 'Carbon Profile Only'
  | 'Balanced (per-family)'
  | 'Auto-Balanced (per-family)'
  | 'Carbon Profile Only (per-family)'
  | 'Minimize Aromatics'
  | 'High Isoparaffins'

export interface FamilyConstraint {
  mode: 'off' | 'range' | 'fixed'
  lo: number
  hi: number
}

export interface PropertyConstraint {
  mode: 'off' | 'min' | 'max' | 'range'
  lo: number
  hi: number
}

export interface DistSpecPoint {
  target: number
  lo: number | null
  hi: number | null
  enabled: boolean
}

export interface CapLimit {
  lo: number
  hi: number
}

export interface SparsityConfig {
  mode: SparsityMode
  threshold_pct: number
  n_components: number
}

interface OptimizerState {
  // Pool selection
  selectedIds:        string[]
  availabilityLimits: Record<string, CapLimit>

  // Targets
  targets: {
    target_n:     number
    target_i:     number
    target_c:     number
    target_a:     number
    cmass_target: number
  }

  // Carbon distribution (20 values C6-C25)
  carbonDist: number[]

  // Scenario
  scenario:  Scenario
  fpBasis:   FpBasis
  nRestarts: number

  // Constraints
  familyConstraints: Record<string, FamilyConstraint>
  componentCaps:     Record<string, CapLimit>

  // Per-family profiles (for per-family scenarios)
  pfTargets: Record<string, number[]>

  // Sparsity
  sparsity: SparsityConfig | null

  // Property constraints (for Studio tab)
  propertyConstraints: Record<string, PropertyConstraint>

  // Target fuel reference (substance_id or null)
  targetFuelId: string | null

  // Distillation design spec
  distSpec: Record<string, DistSpecPoint>

  // Comparison — saved results across runs/tabs
  comparisonItems: { result: OptimizationResult; label: string }[]

  // Active tab (0-4)
  activeTab: number

  // Current run id (for polling)
  activeRunId: string | null

  // Last optimizer result composition — used by Tab4 for EOS calls
  lastRunComposition: Record<string, number>

  // Manual blend composition (Tab 2)
  manualComposition: Record<string, number>

  // EOS settings
  eosStepSize:      number
  eosMixingBehavior: MixingBehavior

  // Actions
  setSelectedIds:        (ids: string[]) => void
  toggleSubstance:       (id: string) => void
  setAvailability:       (id: string, limit: CapLimit) => void
  setTarget:             (key: keyof OptimizerState['targets'], val: number) => void
  setCarbonDist:         (dist: number[]) => void
  setScenario:           (s: Scenario) => void
  setFpBasis:            (b: FpBasis) => void
  setNRestarts:          (n: number) => void
  setFamilyConstraint:   (fam: string, c: FamilyConstraint) => void
  setComponentCap:       (sid: string, cap: CapLimit) => void
  setPfTarget:           (fam: string, dist: number[]) => void
  setSparsity:           (s: SparsityConfig | null) => void
  setPropertyConstraint: (key: string, c: PropertyConstraint) => void
  setTargetFuelId:       (id: string | null) => void
  setDistSpec:           (key: string, pt: DistSpecPoint) => void
  addToComparison:       (item: { result: OptimizationResult; label: string }) => void
  removeFromComparison:  (resultId: string) => void
  clearComparison:       () => void
  setActiveTab:          (t: number) => void
  setActiveRunId:        (id: string | null) => void
  setLastRunComposition: (comp: Record<string, number>) => void
  setManualFraction:     (sid: string, val: number) => void
  setManualComposition:  (comp: Record<string, number>) => void
  setEosStepSize:        (v: number) => void
  setEosMixingBehavior:  (v: MixingBehavior) => void
  reset:                 () => void
}

const DEFAULT_TARGETS = {
  target_n: 20, target_i: 35, target_c: 30, target_a: 15, cmass_target: 86,
}

const DEFAULT_CARBON_DIST = (() => {
  // Roughly jet-fuel shaped C10-C14 peak
  const d = new Array(20).fill(0)
  ;[0.03, 0.08, 0.15, 0.22, 0.22, 0.15, 0.08, 0.04, 0.02, 0.01]
    .forEach((v, i) => { d[i + 4] = v })
  return d
})()

const DEFAULT_DIST_SPEC: Record<string, DistSpecPoint> = {
  IBP: { target: 155, lo: null, hi: null, enabled: false },
  T10: { target: 175, lo: null, hi: null, enabled: false },
  T50: { target: 210, lo: null, hi: null, enabled: false },
  T90: { target: 245, lo: null, hi: null, enabled: false },
  FBP: { target: 280, lo: null, hi: null, enabled: false },
}

const INITIAL: Omit<OptimizerState, keyof { [K in keyof OptimizerState as OptimizerState[K] extends (...args: never[]) => unknown ? K : never]: never }> = {
  selectedIds: [], availabilityLimits: {}, targets: DEFAULT_TARGETS,
  carbonDist: DEFAULT_CARBON_DIST, scenario: 'Balanced', fpBasis: 'mole',
  nRestarts: 8, familyConstraints: {}, componentCaps: {}, pfTargets: {},
  sparsity: null, activeTab: 0, activeRunId: null, manualComposition: {}, lastRunComposition: {},
  eosStepSize: 0.025, eosMixingBehavior: 'Ideal', comparisonItems: [],
  propertyConstraints: {}, targetFuelId: null, distSpec: DEFAULT_DIST_SPEC,
}

export const useOptimizerStore = create<OptimizerState>()(
  persist(
    (set) => ({
  ...INITIAL,

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  toggleSubstance: (id) => set((s) => ({
    selectedIds: s.selectedIds.includes(id)
      ? s.selectedIds.filter(x => x !== id)
      : [...s.selectedIds, id],
  })),

  setAvailability: (id, limit) => set((s) => ({
    availabilityLimits: { ...s.availabilityLimits, [id]: limit },
  })),

  setTarget: (key, val) => set((s) => ({
    targets: { ...s.targets, [key]: val },
  })),

  setCarbonDist: (dist) => set({ carbonDist: dist }),
  setScenario:   (scenario) => set({ scenario }),
  setFpBasis:    (fpBasis) => set({ fpBasis }),
  setNRestarts:  (nRestarts) => set({ nRestarts }),

  setFamilyConstraint: (fam, c) => set((s) => ({
    familyConstraints: { ...s.familyConstraints, [fam]: c },
  })),

  setComponentCap: (sid, cap) => set((s) => ({
    componentCaps: { ...s.componentCaps, [sid]: cap },
  })),

  setPfTarget: (fam, dist) => set((s) => ({
    pfTargets: { ...s.pfTargets, [fam]: dist },
  })),

  setPropertyConstraint: (key, c) => set((s) => ({
    propertyConstraints: { ...s.propertyConstraints, [key]: c },
  })),

  setTargetFuelId: (id) => set({ targetFuelId: id }),

  setDistSpec: (key, pt) => set((s) => ({
    distSpec: { ...s.distSpec, [key]: pt },
  })),

  addToComparison: (item) => set((s) => {
    const already = s.comparisonItems.some(c => c.result.result_id === item.result.result_id)
    if (already) return {}
    return { comparisonItems: [...s.comparisonItems, item] }
  }),
  removeFromComparison: (resultId) => set((s) => ({
    comparisonItems: s.comparisonItems.filter(c => c.result.result_id !== resultId),
  })),
  clearComparison: () => set({ comparisonItems: [] }),

  setSparsity:          (sparsity) => set({ sparsity }),
  setActiveTab:         (activeTab) => set({ activeTab }),
  setActiveRunId:       (activeRunId) => set({ activeRunId }),
  setLastRunComposition: (lastRunComposition) => set({ lastRunComposition }),
  setEosStepSize:       (eosStepSize) => set({ eosStepSize }),
  setEosMixingBehavior: (eosMixingBehavior) => set({ eosMixingBehavior }),

  setManualFraction: (sid, val) => set((s) => ({
    manualComposition: { ...s.manualComposition, [sid]: val },
  })),
  setManualComposition: (comp) => set({ manualComposition: comp }),

  reset: () => set(INITIAL),
    }),
    {
      name: 'proprjet-optimizer',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selectedIds:         state.selectedIds,
        availabilityLimits:  state.availabilityLimits,
        targets:             state.targets,
        carbonDist:          state.carbonDist,
        scenario:            state.scenario,
        fpBasis:             state.fpBasis,
        nRestarts:           state.nRestarts,
        familyConstraints:   state.familyConstraints,
        componentCaps:       state.componentCaps,
        pfTargets:           state.pfTargets,
        sparsity:            state.sparsity,
        propertyConstraints: state.propertyConstraints,
        targetFuelId:        state.targetFuelId,
        distSpec:            state.distSpec,
        comparisonItems:     state.comparisonItems,
        activeTab:           state.activeTab,
        manualComposition:   state.manualComposition,
        lastRunComposition:  state.lastRunComposition,
        eosStepSize:         state.eosStepSize,
        eosMixingBehavior:   state.eosMixingBehavior,
      }),
    }
  )
)
