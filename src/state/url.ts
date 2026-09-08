import { findAppliance } from '../data/appliances'
import { findBatteryModule, findPanel } from '../data/components'
import { findDistrict } from '../data/psh'
import { defaultInputs } from '../engine/defaults'
import type { ApplianceEntry, SystemInputs, SystemType, UsageWindow } from '../engine/types'

/**
 * Only the fields the interface lets a user change are encoded. Derate,
 * diversity factor and minimum ambient temperature are fixed in Phase 2, so
 * decoding restores them from `defaultInputs` rather than trusting the query.
 */

const SYSTEM_TYPES: SystemType[] = ['off-grid', 'hybrid', 'grid-tied']
const USAGE_WINDOWS: UsageWindow[] = ['day', 'night', 'both']

function isSystemType(value: string): value is SystemType {
  return (SYSTEM_TYPES as string[]).includes(value)
}

function isUsageWindow(value: string): value is UsageWindow {
  return (USAGE_WINDOWS as string[]).includes(value)
}

/** A finite number, or undefined. Rejects '', 'NaN', 'Infinity' and prose. */
function num(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export function encodeInputs(inputs: SystemInputs): string {
  const params = new URLSearchParams()
  params.set('t', inputs.systemType)
  params.set('d', inputs.districtId)
  if (inputs.pshOverride !== undefined) params.set('psh', String(inputs.pshOverride))
  params.set('a', String(inputs.autonomyDays))
  params.set('p', inputs.panelId)
  params.set('b', inputs.batteryModuleId)

  if (inputs.load.mode === 'bill') {
    params.set('l', 'b')
    params.set('kwh', String(inputs.load.monthlyKwh))
    params.set('nf', String(inputs.load.nightFraction))
  } else {
    params.set('l', 'a')
    params.set(
      'ap',
      inputs.load.entries.map((e) => `${e.applianceId}:${e.quantity}:${e.hoursPerDay}:${e.usageWindow}`).join(','),
    )
  }

  return params.toString()
}

function decodeEntries(raw: string | null): ApplianceEntry[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((chunk): ApplianceEntry | null => {
      const [applianceId, quantity, hours, window] = chunk.split(':')
      if (!applianceId || !findAppliance(applianceId)) return null
      const q = num(quantity ?? null)
      const h = num(hours ?? null)
      if (q === undefined || h === undefined || !window || !isUsageWindow(window)) return null
      return { applianceId, quantity: q, hoursPerDay: h, usageWindow: window }
    })
    .filter((entry): entry is ApplianceEntry => entry !== null)
}

export function decodeInputs(query: string): SystemInputs | null {
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)

  const type = params.get('t')
  const district = params.get('d')
  if (!type || !isSystemType(type)) return null
  if (!district || !findDistrict(district)) return null

  const defaults = defaultInputs(type, district)
  const panelId = params.get('p')
  const batteryModuleId = params.get('b')
  const autonomy = num(params.get('a'))
  const psh = num(params.get('psh'))
  const nightFraction = num(params.get('nf'))
  const monthlyKwh = num(params.get('kwh'))

  const load: SystemInputs['load'] =
    params.get('l') === 'a'
      ? { mode: 'appliances', entries: decodeEntries(params.get('ap')) }
      : monthlyKwh === undefined
        ? defaults.load
        : {
            mode: 'bill',
            monthlyKwh,
            nightFraction: nightFraction !== undefined && nightFraction >= 0 && nightFraction <= 1 ? nightFraction : 0.6,
          }

  return {
    ...defaults,
    pshOverride: psh,
    autonomyDays: autonomy ?? defaults.autonomyDays,
    panelId: panelId && findPanel(panelId) ? panelId : defaults.panelId,
    batteryModuleId: batteryModuleId && findBatteryModule(batteryModuleId) ? batteryModuleId : defaults.batteryModuleId,
    load,
  }
}
