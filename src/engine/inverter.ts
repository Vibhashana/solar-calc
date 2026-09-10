import { DEFAULTS, INVERTER_MARKET_SIZES_W } from './defaults'
import { round2, sized } from './sized'
import type { DailyLoadProfile, InverterSpec } from './types'

export function roundUpToMarketSize(watts: number): number {
  const match = INVERTER_MARKET_SIZES_W.find((size) => size >= watts)
  return match ?? INVERTER_MARKET_SIZES_W[INVERTER_MARKET_SIZES_W.length - 1] ?? 0
}

export function sizeInverterFromLoad(load: DailyLoadProfile): InverterSpec {
  const withHeadroom = load.continuousPeakW.value * DEFAULTS.inverter.continuousHeadroom
  const continuousW = roundUpToMarketSize(withHeadroom)
  const surgeRequiredW = load.surgePeakW.value

  return {
    continuousW: sized(continuousW, 'W', {
      plain: `A ${round2(continuousW / 1000)} kW inverter suits you. That covers the ${round2(load.continuousPeakW.value)} watts you are likely to draw at once, with room to spare so it is never running flat out.`,
      formula: 'continuousW = roundUpToMarketSize(continuousPeakW x headroom)',
      substituted: `roundUp(${round2(load.continuousPeakW.value)} x ${DEFAULTS.inverter.continuousHeadroom}) = ${continuousW} W`,
      assumptions: [
        `${Math.round((DEFAULTS.inverter.continuousHeadroom - 1) * 100)}% headroom above your expected draw.`,
        'Rounded up to a size actually sold.',
      ],
    }),
    surgeRequiredW: sized(surgeRequiredW, 'W', {
      plain: `Check the inverter can handle ${round2(surgeRequiredW)} watts for a few seconds. Sellers call this the surge or peak rating, and it is separate from the ${round2(continuousW / 1000)} kW continuous figure. Otherwise a fridge or water pump may refuse to start even though the inverter looks big enough on paper.`,
      formula: 'surgeRequiredW = surgePeakW',
      substituted: `surgeRequiredW = ${round2(surgeRequiredW)} W, held for at least ${DEFAULTS.inverter.surgeHoldSeconds} seconds`,
      assumptions: ['One motor starting at a time while everything else runs.'],
    }),
  }
}

export function sizeInverterFromArray(installedPvKw: number): InverterSpec {
  const targetW = (installedPvKw * 1000) / DEFAULTS.gridTiedDcAcRatio
  const continuousW = roundUpToMarketSize(targetW)

  return {
    continuousW: sized(continuousW, 'W', {
      plain: `A ${round2(continuousW / 1000)} kW grid-tied inverter suits a ${round2(installedPvKw)} kW array. It is deliberately a little smaller than the panels, because panels rarely hit their full rating and a slightly smaller inverter costs less while losing almost nothing.`,
      formula: 'continuousW = roundUpToMarketSize(installedPvKw x 1000 / dcAcRatio)',
      substituted: `roundUp(${round2(installedPvKw * 1000)} / ${DEFAULTS.gridTiedDcAcRatio}) = ${continuousW} W`,
      assumptions: [`A DC to AC ratio of ${DEFAULTS.gridTiedDcAcRatio}, which is standard practice.`],
    }),
    surgeRequiredW: sized(0, 'W', {
      plain: 'A grid-tied inverter does not start your appliances — the grid does — so it has no surge requirement.',
      formula: 'surgeRequiredW = 0 for grid-tied systems',
      substituted: 'surgeRequiredW = 0 W',
      assumptions: ['The grid supplies starting current for motors.'],
    }),
  }
}
