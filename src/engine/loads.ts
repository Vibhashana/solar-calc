import { APPLIANCES } from '../data/appliances'
import { DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { Appliance, DailyLoadProfile, LoadInput } from './types'

interface Accumulator {
  dayWh: number
  nightWh: number
  connectedW: number
  largestExtraSurgeW: number
}

function accumulate(load: Extract<LoadInput, { mode: 'appliances' }>, catalog: Appliance[]): Accumulator {
  const acc: Accumulator = { dayWh: 0, nightWh: 0, connectedW: 0, largestExtraSurgeW: 0 }

  for (const entry of load.entries) {
    const appliance = catalog.find((a) => a.id === entry.applianceId)
    if (!appliance) continue

    const wh = appliance.watts * entry.quantity * entry.hoursPerDay
    if (entry.usageWindow === 'day') acc.dayWh += wh
    else if (entry.usageWindow === 'night') acc.nightWh += wh
    else {
      acc.dayWh += wh / 2
      acc.nightWh += wh / 2
    }

    acc.connectedW += appliance.watts * entry.quantity
    const extraSurge = appliance.watts * (appliance.surgeFactor - 1)
    if (extraSurge > acc.largestExtraSurgeW) acc.largestExtraSurgeW = extraSurge
  }

  return acc
}

export function computeLoadProfile(
  load: LoadInput,
  diversityFactor: number,
  catalog: Appliance[] = APPLIANCES,
): DailyLoadProfile {
  if (load.mode === 'appliances') {
    const acc = accumulate(load, catalog)
    const dayKwh = acc.dayWh / 1000
    const nightKwh = acc.nightWh / 1000
    const dailyKwh = dayKwh + nightKwh
    const continuousPeakW = acc.connectedW * diversityFactor
    const surgePeakW = continuousPeakW + acc.largestExtraSurgeW

    return {
      dailyKwh: sized(dailyKwh, 'kWh per day', {
        plain: `Your appliances use about ${round2(dailyKwh)} units of electricity a day.`,
        formula: 'dailyKwh = sum(watts x quantity x hoursPerDay) / 1000',
        substituted: `${round2(acc.dayWh + acc.nightWh)} Wh / 1000 = ${round2(dailyKwh)} kWh`,
        assumptions: ['Each appliance runs for the hours you entered, every day.'],
      }),
      dayKwh: sized(dayKwh, 'kWh per day', {
        plain: `About ${round2(dayKwh)} units are used during daylight, when the panels are working.`,
        formula: 'dayKwh = sum(daytime appliance energy) / 1000',
        substituted: `${round2(acc.dayWh)} Wh / 1000 = ${round2(dayKwh)} kWh`,
        assumptions: ['Appliances marked "both" are split evenly between day and night.'],
      }),
      nightKwh: sized(nightKwh, 'kWh per day', {
        plain: `About ${round2(nightKwh)} units are used after dark, so the battery has to cover them.`,
        formula: 'nightKwh = sum(night-time appliance energy) / 1000',
        substituted: `${round2(acc.nightWh)} Wh / 1000 = ${round2(nightKwh)} kWh`,
        assumptions: ['Appliances marked "both" are split evenly between day and night.'],
      }),
      continuousPeakW: sized(continuousPeakW, 'W', {
        plain: `If everything you listed were plugged in you would draw ${round2(acc.connectedW)} watts, but in practice not everything runs at once, so we plan for about ${round2(continuousPeakW)} watts.`,
        formula: 'continuousPeakW = connectedW x diversityFactor',
        substituted: `${round2(acc.connectedW)} x ${round2(diversityFactor)} = ${round2(continuousPeakW)} W`,
        assumptions: [`Diversity factor of ${diversityFactor} — roughly two thirds of your appliances running together.`],
      }),
      surgePeakW: sized(surgePeakW, 'W', {
        plain: `Motors draw extra power for a second when they start. Your biggest starter adds ${round2(acc.largestExtraSurgeW)} watts on top, so the inverter must briefly handle about ${round2(surgePeakW)} watts.`,
        formula: 'surgePeakW = continuousPeakW + max(watts x (surgeFactor - 1))',
        substituted: `${round2(continuousPeakW)} + ${round2(acc.largestExtraSurgeW)} = ${round2(surgePeakW)} W`,
        assumptions: ['Only one motor is assumed to start at any given moment.'],
      }),
      isPeakEstimated: false,
    }
  }

  const dailyKwh = load.monthlyKwh / DEFAULTS.daysPerMonth
  const nightKwh = dailyKwh * load.nightFraction
  const dayKwh = dailyKwh - nightKwh
  const meanW = (dailyKwh * 1000) / 24
  const continuousPeakW = meanW * DEFAULTS.billPeakToMeanRatio
  const surgePeakW = continuousPeakW * 2

  return {
    dailyKwh: sized(dailyKwh, 'kWh per day', {
      plain: `A bill of ${round2(load.monthlyKwh)} units a month works out to about ${round2(dailyKwh)} units a day.`,
      formula: 'dailyKwh = monthlyKwh / daysPerMonth',
      substituted: `${round2(load.monthlyKwh)} / ${DEFAULTS.daysPerMonth} = ${round2(dailyKwh)} kWh`,
      assumptions: [`An average month is ${DEFAULTS.daysPerMonth} days.`],
    }),
    dayKwh: sized(dayKwh, 'kWh per day', {
      plain: `We assume about ${round2(dayKwh)} units are used during daylight.`,
      formula: 'dayKwh = dailyKwh x (1 - nightFraction)',
      substituted: `${round2(dailyKwh)} x ${round2(1 - load.nightFraction)} = ${round2(dayKwh)} kWh`,
      assumptions: [`${Math.round(load.nightFraction * 100)}% of household use happens after dark.`],
    }),
    nightKwh: sized(nightKwh, 'kWh per day', {
      plain: `We assume about ${round2(nightKwh)} units are used after dark, which the battery must cover.`,
      formula: 'nightKwh = dailyKwh x nightFraction',
      substituted: `${round2(dailyKwh)} x ${round2(load.nightFraction)} = ${round2(nightKwh)} kWh`,
      assumptions: [`${Math.round(load.nightFraction * 100)}% of household use happens after dark.`],
    }),
    continuousPeakW: sized(continuousPeakW, 'W', {
      plain: `Your bill does not say how much you draw at once, so this is an estimate: about ${round2(continuousPeakW)} watts. List your appliances instead if you want the inverter size to be reliable.`,
      formula: 'continuousPeakW = (dailyKwh x 1000 / 24) x peakToMeanRatio',
      substituted: `${round2(meanW)} x ${DEFAULTS.billPeakToMeanRatio} = ${round2(continuousPeakW)} W`,
      assumptions: [`Peak demand is about ${DEFAULTS.billPeakToMeanRatio} times average demand in a typical home.`],
    }),
    surgePeakW: sized(surgePeakW, 'W', {
      plain: `Allowing for motors starting up, the inverter should briefly handle about ${round2(surgePeakW)} watts. This is also an estimate.`,
      formula: 'surgePeakW = continuousPeakW x 2',
      substituted: `${round2(continuousPeakW)} x 2 = ${round2(surgePeakW)} W`,
      assumptions: ['A typical home has at least one motor load that doubles the momentary draw.'],
    }),
    isPeakEstimated: true,
  }
}
