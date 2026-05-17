// Mixed-use blending math — pure functions, no side effects.
// Takes N components (each with NOI + cap rate) and blends into one value.

export const ASSET_TYPE_CAP_RANGES = {
  storage:     { low: 0.055, mid: 0.065, high: 0.080, label: 'Self-Storage' },
  residential: { low: 0.050, mid: 0.065, high: 0.080, label: 'Residential (2–4 unit)' },
  mf:          { low: 0.050, mid: 0.060, high: 0.075, label: 'Multifamily 5+' },
  mhp:         { low: 0.070, mid: 0.085, high: 0.110, label: 'Mobile Home Park' },
  commercial:  { low: 0.065, mid: 0.080, high: 0.100, label: 'Commercial / Retail / Office' },
  industrial:  { low: 0.055, mid: 0.070, high: 0.085, label: 'Industrial / Flex / Warehouse' },
  nnn:         { low: 0.050, mid: 0.062, high: 0.075, label: 'NNN / Single-Tenant' },
}

export const ASSET_TYPE_LABELS = Object.fromEntries(
  Object.entries(ASSET_TYPE_CAP_RANGES).map(([k, v]) => [k, v.label])
)

// Component flag: if component NOI < this % of total NOI, suggest folding into OpEx
const MINOR_COMPONENT_THRESHOLD = 0.10

export function blendComponents(components, discountPct = 0) {
  // components: [{ id, label, assetType, noi, capRate }]
  const valid = components.filter(c =>
    c.noi > 0 && c.capRate > 0 && c.capRate < 1
  )

  if (valid.length === 0) return { ok: false, error: 'No valid components.' }

  const valued = valid.map(c => ({
    ...c,
    value: c.noi / c.capRate,
    label: c.label || ASSET_TYPE_LABELS[c.assetType] || c.assetType
  }))

  const totalNoi = valued.reduce((s, c) => s + c.noi, 0)
  const totalValue = valued.reduce((s, c) => s + c.value, 0)
  const blendedCapRate = totalValue > 0 ? totalNoi / totalValue : 0
  const discount = parseFloat(discountPct) || 0
  const discountedValue = totalValue * (1 - discount / 100)
  const discountAmount = totalValue - discountedValue

  // Flag minor components
  const withFlags = valued.map(c => ({
    ...c,
    pctOfNoi: totalNoi > 0 ? c.noi / totalNoi : 0,
    minor: totalNoi > 0 && c.noi / totalNoi < MINOR_COMPONENT_THRESHOLD
  }))

  // Dominant component
  const dominant = [...withFlags].sort((a, b) => b.value - a.value)[0]

  return {
    ok: true,
    components: withFlags,
    totalNoi,
    totalValue,
    blendedCapRate,
    discount,
    discountAmount,
    discountedValue,
    dominant,
    componentCount: valid.length
  }
}
