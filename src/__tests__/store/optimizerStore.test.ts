import { describe, it, expect, beforeEach } from 'vitest'
import { useOptimizerStore } from '@/store/optimizerStore'
import type { FamilyConstraint, PropertyConstraint, SparsityConfig } from '@/store/optimizerStore'
import type { OptimizationResult, ComputedProperties } from '@/types'

// Reset Zustand store state between tests by calling reset()
beforeEach(() => {
  useOptimizerStore.getState().reset()
})

describe('toggleSubstance', () => {
  it('adds a substance id when not present', () => {
    useOptimizerStore.getState().toggleSubstance('s1')
    expect(useOptimizerStore.getState().selectedIds).toContain('s1')
  })

  it('removes a substance id when already present', () => {
    useOptimizerStore.getState().toggleSubstance('s1')
    useOptimizerStore.getState().toggleSubstance('s1')
    expect(useOptimizerStore.getState().selectedIds).not.toContain('s1')
  })

  it('handles multiple substances independently', () => {
    useOptimizerStore.getState().toggleSubstance('s1')
    useOptimizerStore.getState().toggleSubstance('s2')
    useOptimizerStore.getState().toggleSubstance('s1')

    const { selectedIds } = useOptimizerStore.getState()
    expect(selectedIds).not.toContain('s1')
    expect(selectedIds).toContain('s2')
  })

  it('preserves insertion order for remaining items', () => {
    useOptimizerStore.getState().toggleSubstance('s1')
    useOptimizerStore.getState().toggleSubstance('s2')
    useOptimizerStore.getState().toggleSubstance('s3')
    useOptimizerStore.getState().toggleSubstance('s2')

    expect(useOptimizerStore.getState().selectedIds).toEqual(['s1', 's3'])
  })
})

describe('setAvailability', () => {
  it('stores lo/hi limits per substance', () => {
    useOptimizerStore.getState().setAvailability('s1', { lo: 0.1, hi: 0.9 })

    const limits = useOptimizerStore.getState().availabilityLimits
    expect(limits['s1']).toEqual({ lo: 0.1, hi: 0.9 })
  })

  it('overwrites existing limits for same substance', () => {
    useOptimizerStore.getState().setAvailability('s1', { lo: 0.0, hi: 1.0 })
    useOptimizerStore.getState().setAvailability('s1', { lo: 0.2, hi: 0.8 })

    expect(useOptimizerStore.getState().availabilityLimits['s1']).toEqual({ lo: 0.2, hi: 0.8 })
  })

  it('tracks limits for multiple substances independently', () => {
    useOptimizerStore.getState().setAvailability('s1', { lo: 0.0, hi: 0.5 })
    useOptimizerStore.getState().setAvailability('s2', { lo: 0.1, hi: 1.0 })

    const limits = useOptimizerStore.getState().availabilityLimits
    expect(limits['s1']).toEqual({ lo: 0.0, hi: 0.5 })
    expect(limits['s2']).toEqual({ lo: 0.1, hi: 1.0 })
  })
})

describe('setActiveTab', () => {
  it('updates activeTab to the given value', () => {
    useOptimizerStore.getState().setActiveTab(3)
    expect(useOptimizerStore.getState().activeTab).toBe(3)
  })

  it('can switch back to tab 0', () => {
    useOptimizerStore.getState().setActiveTab(4)
    useOptimizerStore.getState().setActiveTab(0)
    expect(useOptimizerStore.getState().activeTab).toBe(0)
  })
})

describe('setActiveRunId', () => {
  it('stores a run id', () => {
    useOptimizerStore.getState().setActiveRunId('run_abc123')
    expect(useOptimizerStore.getState().activeRunId).toBe('run_abc123')
  })

  it('clears run id when set to null', () => {
    useOptimizerStore.getState().setActiveRunId('run_abc123')
    useOptimizerStore.getState().setActiveRunId(null)
    expect(useOptimizerStore.getState().activeRunId).toBeNull()
  })
})

describe('setLastRunComposition', () => {
  it('stores composition record', () => {
    const comp = { s1: 0.6, s2: 0.4 }
    useOptimizerStore.getState().setLastRunComposition(comp)
    expect(useOptimizerStore.getState().lastRunComposition).toEqual(comp)
  })

  it('replaces previous composition entirely', () => {
    useOptimizerStore.getState().setLastRunComposition({ s1: 0.5, s2: 0.5 })
    useOptimizerStore.getState().setLastRunComposition({ s3: 1.0 })
    expect(useOptimizerStore.getState().lastRunComposition).toEqual({ s3: 1.0 })
    expect(useOptimizerStore.getState().lastRunComposition['s1']).toBeUndefined()
  })
})

describe('reset', () => {
  it('clears selectedIds', () => {
    useOptimizerStore.getState().toggleSubstance('s1')
    useOptimizerStore.getState().reset()
    expect(useOptimizerStore.getState().selectedIds).toEqual([])
  })

  it('clears availabilityLimits', () => {
    useOptimizerStore.getState().setAvailability('s1', { lo: 0, hi: 1 })
    useOptimizerStore.getState().reset()
    expect(useOptimizerStore.getState().availabilityLimits).toEqual({})
  })

  it('resets activeTab to 0', () => {
    useOptimizerStore.getState().setActiveTab(4)
    useOptimizerStore.getState().reset()
    expect(useOptimizerStore.getState().activeTab).toBe(0)
  })

  it('resets activeRunId to null', () => {
    useOptimizerStore.getState().setActiveRunId('run_xyz')
    useOptimizerStore.getState().reset()
    expect(useOptimizerStore.getState().activeRunId).toBeNull()
  })

  it('resets scenario to Balanced', () => {
    useOptimizerStore.getState().setScenario('Minimize Aromatics')
    useOptimizerStore.getState().reset()
    expect(useOptimizerStore.getState().scenario).toBe('Balanced')
  })
})

describe('setScenario', () => {
  it('updates scenario', () => {
    useOptimizerStore.getState().setScenario('Auto-Balanced')
    expect(useOptimizerStore.getState().scenario).toBe('Auto-Balanced')
  })
})

describe('setManualFraction', () => {
  it('stores fraction value per substance', () => {
    useOptimizerStore.getState().setManualFraction('s1', 0.35)
    expect(useOptimizerStore.getState().manualComposition['s1']).toBe(0.35)
  })

  it('updates existing fraction', () => {
    useOptimizerStore.getState().setManualFraction('s1', 0.35)
    useOptimizerStore.getState().setManualFraction('s1', 0.60)
    expect(useOptimizerStore.getState().manualComposition['s1']).toBe(0.60)
  })
})

// ── setFamilyConstraint ───────────────────────────────────────────────────────

describe('setFamilyConstraint', () => {
  it('stores constraint for the given family', () => {
    const c: FamilyConstraint = { mode: 'range', lo: 10, hi: 40 }
    useOptimizerStore.getState().setFamilyConstraint('npara', c)
    expect(useOptimizerStore.getState().familyConstraints['npara']).toEqual(c)
  })

  it('does not overwrite unrelated families', () => {
    useOptimizerStore.getState().setFamilyConstraint('npara', { mode: 'range', lo: 0, hi: 50 })
    useOptimizerStore.getState().setFamilyConstraint('arom', { mode: 'fixed', lo: 20, hi: 20 })
    expect(useOptimizerStore.getState().familyConstraints['npara']).toBeDefined()
    expect(useOptimizerStore.getState().familyConstraints['arom']).toBeDefined()
  })

  it('overwrites existing constraint for same family', () => {
    useOptimizerStore.getState().setFamilyConstraint('isopara', { mode: 'range', lo: 5, hi: 30 })
    useOptimizerStore.getState().setFamilyConstraint('isopara', { mode: 'off', lo: 0, hi: 100 })
    expect(useOptimizerStore.getState().familyConstraints['isopara'].mode).toBe('off')
  })
})

// ── setTarget ─────────────────────────────────────────────────────────────────

describe('setTarget', () => {
  it('updates a single target key without touching the others', () => {
    const before = useOptimizerStore.getState().targets
    useOptimizerStore.getState().setTarget('target_n', 25)
    const after = useOptimizerStore.getState().targets
    expect(after.target_n).toBe(25)
    // all other targets unchanged
    expect(after.target_i).toBe(before.target_i)
    expect(after.target_c).toBe(before.target_c)
    expect(after.target_a).toBe(before.target_a)
  })

  it('can set cmass_target independently', () => {
    useOptimizerStore.getState().setTarget('cmass_target', 85.5)
    expect(useOptimizerStore.getState().targets.cmass_target).toBe(85.5)
  })
})

// ── setSparsity ───────────────────────────────────────────────────────────────

describe('setSparsity', () => {
  it('stores a SparsityConfig', () => {
    const cfg: SparsityConfig = { mode: 'fixed_n', threshold_pct: 0.01, n_components: 4 }
    useOptimizerStore.getState().setSparsity(cfg)
    expect(useOptimizerStore.getState().sparsity).toEqual(cfg)
  })

  it('can be cleared to null', () => {
    useOptimizerStore.getState().setSparsity({ mode: 'threshold', threshold_pct: 0.05, n_components: 0 })
    useOptimizerStore.getState().setSparsity(null)
    expect(useOptimizerStore.getState().sparsity).toBeNull()
  })
})

// ── setPropertyConstraint ─────────────────────────────────────────────────────

describe('setPropertyConstraint', () => {
  it('stores a property constraint by key', () => {
    const c: PropertyConstraint = { mode: 'max', lo: 0, hi: 840 }
    useOptimizerStore.getState().setPropertyConstraint('density', c)
    expect(useOptimizerStore.getState().propertyConstraints['density']).toEqual(c)
  })

  it('stores multiple constraints independently', () => {
    useOptimizerStore.getState().setPropertyConstraint('density', { mode: 'max', lo: 0, hi: 840 })
    useOptimizerStore.getState().setPropertyConstraint('flash_point', { mode: 'min', lo: 38, hi: 100 })
    const { propertyConstraints } = useOptimizerStore.getState()
    expect(propertyConstraints['density'].hi).toBe(840)
    expect(propertyConstraints['flash_point'].lo).toBe(38)
  })
})

// ── setComponentCap ───────────────────────────────────────────────────────────

describe('setComponentCap', () => {
  it('stores lo/hi cap for a substance', () => {
    useOptimizerStore.getState().setComponentCap('s1', { lo: 0.05, hi: 0.4 })
    expect(useOptimizerStore.getState().componentCaps['s1']).toEqual({ lo: 0.05, hi: 0.4 })
  })

  it('caps for different substances do not interfere', () => {
    useOptimizerStore.getState().setComponentCap('s1', { lo: 0.0, hi: 0.5 })
    useOptimizerStore.getState().setComponentCap('s2', { lo: 0.1, hi: 0.9 })
    expect(useOptimizerStore.getState().componentCaps['s1'].hi).toBe(0.5)
    expect(useOptimizerStore.getState().componentCaps['s2'].lo).toBe(0.1)
  })
})

// ── setTargetFuelId ───────────────────────────────────────────────────────────

describe('setTargetFuelId', () => {
  it('stores a substance id as target fuel', () => {
    useOptimizerStore.getState().setTargetFuelId('jet-a')
    expect(useOptimizerStore.getState().targetFuelId).toBe('jet-a')
  })

  it('can be cleared to null', () => {
    useOptimizerStore.getState().setTargetFuelId('jet-a')
    useOptimizerStore.getState().setTargetFuelId(null)
    expect(useOptimizerStore.getState().targetFuelId).toBeNull()
  })
})

// ── comparison panel ──────────────────────────────────────────────────────────

function makeResult(id: string): OptimizationResult {
  return {
    result_id: id,
    result_name: `Result ${id}`,
    composition: { s1: 1.0 },
    computed_properties: {} as ComputedProperties,
    eos_distillation_pts: null,
    eos_pvap_pts: null,
    eos_distillation_curve: null,
    eos_pvap_curve: null,
    objective_value: 0,
    converged: true,
    sparsity_desc: null,
  }
}

describe('addToComparison', () => {
  it('adds a result to comparisonItems', () => {
    useOptimizerStore.getState().addToComparison({ result: makeResult('r1'), label: 'Run A' })
    expect(useOptimizerStore.getState().comparisonItems).toHaveLength(1)
    expect(useOptimizerStore.getState().comparisonItems[0].result.result_id).toBe('r1')
  })

  it('does not add duplicates by result_id', () => {
    useOptimizerStore.getState().addToComparison({ result: makeResult('r1'), label: 'Run A' })
    useOptimizerStore.getState().addToComparison({ result: makeResult('r1'), label: 'Run A dup' })
    expect(useOptimizerStore.getState().comparisonItems).toHaveLength(1)
  })

  it('allows multiple distinct results', () => {
    useOptimizerStore.getState().addToComparison({ result: makeResult('r1'), label: 'A' })
    useOptimizerStore.getState().addToComparison({ result: makeResult('r2'), label: 'B' })
    expect(useOptimizerStore.getState().comparisonItems).toHaveLength(2)
  })
})

describe('removeFromComparison', () => {
  it('removes a result by result_id', () => {
    useOptimizerStore.getState().addToComparison({ result: makeResult('r1'), label: 'A' })
    useOptimizerStore.getState().addToComparison({ result: makeResult('r2'), label: 'B' })
    useOptimizerStore.getState().removeFromComparison('r1')
    const items = useOptimizerStore.getState().comparisonItems
    expect(items).toHaveLength(1)
    expect(items[0].result.result_id).toBe('r2')
  })

  it('is a no-op when result_id is not in list', () => {
    useOptimizerStore.getState().addToComparison({ result: makeResult('r1'), label: 'A' })
    useOptimizerStore.getState().removeFromComparison('r999')
    expect(useOptimizerStore.getState().comparisonItems).toHaveLength(1)
  })
})

describe('clearComparison', () => {
  it('empties the comparisonItems list', () => {
    useOptimizerStore.getState().addToComparison({ result: makeResult('r1'), label: 'A' })
    useOptimizerStore.getState().addToComparison({ result: makeResult('r2'), label: 'B' })
    useOptimizerStore.getState().clearComparison()
    expect(useOptimizerStore.getState().comparisonItems).toHaveLength(0)
  })
})
