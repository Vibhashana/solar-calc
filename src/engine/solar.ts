import { annualMeanPsh, worstMonthPsh, type District } from '../data/psh'
import { round2, sized } from './sized'
import type { ArraySpec, DerateFactors, PanelSpec, Sized, SystemType } from './types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function combinedDerate(d: DerateFactors): number {
  return d.soiling * d.temperature * d.wiring * d.conversion
}

export function resolveDesignPsh(
  systemType: SystemType,
  district: District,
  override?: number,
): Sized<number> {
  if (override !== undefined) {
    return sized(override, 'sun hours per day', {
      plain: `Using your own figure of ${round2(override)} good sun hours a day.`,
      formula: 'designPsh = userOverride',
      substituted: `designPsh = ${round2(override)} hours (your own figure)`,
      assumptions: ['You supplied this figure yourself.'],
    })
  }

  if (systemType === 'grid-tied') {
    const mean = annualMeanPsh(district)
    return sized(mean, 'sun hours per day', {
      plain: `${district.name} averages about ${round2(mean)} hours of full-strength sunshine a day across the year. Since the grid covers any shortfall, we design to the yearly average.`,
      formula: 'designPsh = mean(monthlyPsh)',
      substituted: `mean of 12 monthly values = ${round2(mean)} hours`,
      assumptions: ['Long-term monthly averages from NASA POWER.'],
    })
  }

  const worst = worstMonthPsh(district)
  const worstIndex = district.monthlyPsh.indexOf(worst)
  const monthName = MONTH_NAMES[worstIndex] ?? 'the worst month'

  return sized(worst, 'sun hours per day', {
    plain: `${monthName} is the cloudiest month in ${district.name}, with about ${round2(worst)} hours of full-strength sunshine a day. We size for that month so the system still works when sunshine is at its worst.`,
    formula: 'designPsh = min(monthlyPsh)',
    substituted: `min of 12 monthly values = ${round2(worst)} hours (${monthName})`,
    assumptions: [
      'Long-term monthly averages from NASA POWER.',
      'Designing for the worst month costs more panels but avoids running short in the rainy season.',
    ],
  })
}

export function sizeArray(
  dailyKwh: number,
  designPsh: Sized<number>,
  derate: DerateFactors,
  panel: PanelSpec,
): ArraySpec {
  const derateTotal = combinedDerate(derate)
  const psh = designPsh.value
  const requiredPvKw = psh > 0 && derateTotal > 0 ? dailyKwh / (psh * derateTotal) : 0
  const panelKw = panel.watts / 1000
  const panelCount = panelKw > 0 ? Math.ceil(requiredPvKw / panelKw) : 0
  const installedPvKw = panelCount * panelKw
  const roofAreaM2 = panelCount * panel.areaM2

  return {
    designPsh,
    derateTotal: sized(derateTotal, 'fraction', {
      plain: `Panels never deliver their full rating in the real world. After dust, heat, cable losses and conversion, expect about ${Math.round(derateTotal * 100)}% of the number printed on the panel.`,
      formula: 'derateTotal = soiling x temperature x wiring x conversion',
      substituted: `${round2(derate.soiling)} x ${round2(derate.temperature)} x ${round2(derate.wiring)} x ${round2(derate.conversion)} = ${round2(derateTotal)}`,
      assumptions: [
        `Dust and dirt: ${Math.round((1 - derate.soiling) * 100)}% loss.`,
        `Heat: ${Math.round((1 - derate.temperature) * 100)}% loss — panels lose output as they get hot, and Sri Lankan roofs get very hot.`,
        `Cables: ${Math.round((1 - derate.wiring) * 100)}% loss.`,
        `Conversion: ${Math.round((1 - derate.conversion) * 100)}% loss.`,
      ],
    }),
    requiredPvKw: sized(requiredPvKw, 'kW', {
      plain: `You need about ${round2(requiredPvKw)} kW of panels to generate ${round2(dailyKwh)} units a day.`,
      formula: 'requiredPvKw = dailyKwh / (designPsh x derateTotal)',
      substituted: `${round2(dailyKwh)} / (${round2(psh)} x ${round2(derateTotal)}) = ${round2(requiredPvKw)} kW`,
      assumptions: ['Panels face the sun without significant shading.'],
    }),
    panelCount: sized(panelCount, 'panels', {
      plain: `That is ${panelCount} panels of ${panel.watts} W each. We always round up, because a partial panel does not exist.`,
      formula: 'panelCount = ceil(requiredPvKw / panelKw)',
      substituted: `ceil(${round2(requiredPvKw)} / ${panelKw}) = ${panelCount}`,
      assumptions: [`Using ${panel.name}.`],
    }),
    installedPvKw: sized(installedPvKw, 'kW', {
      plain: `${panelCount} panels comes to ${round2(installedPvKw)} kW installed.`,
      formula: 'installedPvKw = panelCount x panelKw',
      substituted: `${panelCount} x ${panelKw} = ${round2(installedPvKw)} kW`,
      assumptions: [],
    }),
    roofAreaM2: sized(roofAreaM2, 'm2', {
      plain: `You need roughly ${round2(roofAreaM2)} square metres of unshaded roof — check you have that much before buying anything.`,
      formula: 'roofAreaM2 = panelCount x panelAreaM2',
      substituted: `${panelCount} x ${panel.areaM2} = ${round2(roofAreaM2)} m2`,
      assumptions: ['Panels laid flat against the roof with no walking space between rows.'],
    }),
  }
}
