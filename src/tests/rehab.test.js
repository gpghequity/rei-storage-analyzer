import { describe, it, expect } from 'vitest'
import { freshSystems, SYSTEMS_BY_MODE } from '../math/rehab/rehabSystems.js'
import { computeRowTotal, calcRehab, totalSqFt } from '../math/rehab/rehabMath.js'

// Verifies the Rehab Calc engine ported into Baby matches the source math.
describe('Rehab engine (ported from Rehab Calc)', () => {
  const sizing = { units: 1, sqFtPerUnit: 800, commonSqFt: 100, stories: 1 }

  it('totalSqFt = sqFtPerUnit×units + common', () => {
    expect(totalSqFt(sizing)).toBe(900)
  })

  it('cosmetic rate_x_sizing: $15 × 900sf × 80% (old) = $10,800', () => {
    const cosmetic = { id: 'cosmetic', pattern: 'A', pricing: { kind: 'rate_x_sizing', baseCost: 15, sizingTerm: 'totalSqFt' }, condition: 'old' }
    expect(computeRowTotal(cosmetic, sizing)).toBe(10800)
  })

  it('kitchen static_per_unit: $7,000 (old) × 1 unit = $7,000', () => {
    const kitchen = { id: 'kitchen', pattern: 'A', pricing: { kind: 'static_per_unit', tiers: { new: 0, modern: 2000, semiModern: 4000, old: 7000, missing: 10000 } }, condition: 'old' }
    expect(computeRowTotal(kitchen, sizing)).toBe(7000)
  })

  it('full bath static_per_count: $1,500 (modern) × 2 = $3,000', () => {
    const bath = { id: 'fullBath', pattern: 'B', pricing: { kind: 'static_per_count', tiers: { new: 0, modern: 1500, semiModern: 2500, old: 4000, missing: 6000 }, defaultCount: 0 }, condition: 'modern', count: 2 }
    expect(computeRowTotal(bath, sizing)).toBe(3000)
  })

  it('amounts (Pattern C): selected amount IS the total', () => {
    const furnace = { id: 'furnace', pattern: 'C', pricing: { kind: 'amounts', amounts: [0, 1000, 6000] }, selectedAmount: 6000 }
    expect(computeRowTotal(furnace, sizing)).toBe(6000)
  })

  it('calcRehab sums rows and separates holding from rehab total', () => {
    const systems = [
      { id: 'kitchen', label: 'Kitchen', pattern: 'A', pricing: { kind: 'static_per_unit', tiers: { old: 7000 } }, condition: 'old' },
      { id: 'holding', label: 'Holding', pattern: 'D', pricing: { kind: 'amounts', amounts: [0, 1500] }, selectedAmount: 1500 }
    ]
    const r = calcRehab(systems, sizing)
    expect(r.totalRehab).toBe(7000)      // excludes holding
    expect(r.holdingCost).toBe(1500)
    expect(r.grandTotal).toBe(8500)
  })

  it('storage HVAC row is hidden when climateUnits = 0', () => {
    const sys = freshSystems('storage')
    const r = calcRehab(sys, { totalUnits: 200, climateUnits: 0 })
    expect(r.lineItems.find(li => li.id === 'hvac')).toBeUndefined()
  })

  it('exposes residential, storage, and commercial system sets', () => {
    expect(SYSTEMS_BY_MODE.residential.length).toBeGreaterThan(10)
    expect(SYSTEMS_BY_MODE.storage.length).toBeGreaterThan(10)
    expect(SYSTEMS_BY_MODE.commercial.length).toBeGreaterThan(5)
  })
})
