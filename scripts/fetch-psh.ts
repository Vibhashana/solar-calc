/**
 * Regenerates src/data/psh.ts from the NASA POWER climatology API.
 * Run with: npm run fetch:psh
 *
 * Parameter ALLSKY_SFC_SW_DWN is long-term monthly mean all-sky surface
 * shortwave downward irradiance in kWh/m^2/day, which equals peak sun hours.
 */
import { writeFileSync } from 'node:fs'

interface Place {
  id: string
  name: string
  latitude: number
  longitude: number
}

const DISTRICT_CAPITALS: Place[] = [
  { id: 'colombo', name: 'Colombo', latitude: 6.93, longitude: 79.86 },
  { id: 'gampaha', name: 'Gampaha', latitude: 7.09, longitude: 80.0 },
  { id: 'kalutara', name: 'Kalutara', latitude: 6.58, longitude: 79.96 },
  { id: 'kandy', name: 'Kandy', latitude: 7.29, longitude: 80.63 },
  { id: 'matale', name: 'Matale', latitude: 7.47, longitude: 80.62 },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', latitude: 6.97, longitude: 80.79 },
  { id: 'galle', name: 'Galle', latitude: 6.05, longitude: 80.22 },
  { id: 'matara', name: 'Matara', latitude: 5.95, longitude: 80.54 },
  { id: 'hambantota', name: 'Hambantota', latitude: 6.12, longitude: 81.12 },
  { id: 'jaffna', name: 'Jaffna', latitude: 9.66, longitude: 80.02 },
  { id: 'kilinochchi', name: 'Kilinochchi', latitude: 9.4, longitude: 80.4 },
  { id: 'mannar', name: 'Mannar', latitude: 8.98, longitude: 79.9 },
  { id: 'vavuniya', name: 'Vavuniya', latitude: 8.75, longitude: 80.5 },
  { id: 'mullaitivu', name: 'Mullaitivu', latitude: 9.27, longitude: 80.81 },
  { id: 'batticaloa', name: 'Batticaloa', latitude: 7.71, longitude: 81.69 },
  { id: 'ampara', name: 'Ampara', latitude: 7.3, longitude: 81.67 },
  { id: 'trincomalee', name: 'Trincomalee', latitude: 8.59, longitude: 81.21 },
  { id: 'kurunegala', name: 'Kurunegala', latitude: 7.49, longitude: 80.36 },
  { id: 'puttalam', name: 'Puttalam', latitude: 8.03, longitude: 79.83 },
  { id: 'anuradhapura', name: 'Anuradhapura', latitude: 8.31, longitude: 80.4 },
  { id: 'polonnaruwa', name: 'Polonnaruwa', latitude: 7.94, longitude: 81.0 },
  { id: 'badulla', name: 'Badulla', latitude: 6.99, longitude: 81.06 },
  { id: 'monaragala', name: 'Monaragala', latitude: 6.87, longitude: 81.35 },
  { id: 'ratnapura', name: 'Ratnapura', latitude: 6.68, longitude: 80.4 },
  { id: 'kegalle', name: 'Kegalle', latitude: 7.25, longitude: 80.35 },
]

const MONTH_KEYS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const

async function fetchMonthlyPsh(place: Place): Promise<number[]> {
  const url =
    'https://power.larc.nasa.gov/api/temporal/climatology/point' +
    `?parameters=ALLSKY_SFC_SW_DWN&community=RE` +
    `&latitude=${place.latitude}&longitude=${place.longitude}&format=JSON`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`${place.id}: HTTP ${response.status}`)

  const body = (await response.json()) as {
    properties: { parameter: { ALLSKY_SFC_SW_DWN: Record<string, number> } }
  }
  const monthly = body.properties.parameter.ALLSKY_SFC_SW_DWN

  return MONTH_KEYS.map((key) => {
    const value = monthly[key]
    if (typeof value !== 'number' || value <= 0) {
      throw new Error(`${place.id}: missing or invalid value for ${key}`)
    }
    return Math.round(value * 100) / 100
  })
}

async function main(): Promise<void> {
  const rows: string[] = []
  for (const place of DISTRICT_CAPITALS) {
    const monthlyPsh = await fetchMonthlyPsh(place)
    rows.push(
      `  { id: '${place.id}', name: '${place.name}', latitude: ${place.latitude}, ` +
        `longitude: ${place.longitude}, monthlyPsh: [${monthlyPsh.join(', ')}] },`,
    )
    console.log(`fetched ${place.id}`)
  }

  const file = `// GENERATED FILE - DO NOT EDIT BY HAND.
// Regenerate with: npm run fetch:psh
//
// Source: NASA POWER, parameter ALLSKY_SFC_SW_DWN (climatology),
//         https://power.larc.nasa.gov/
// Units:  kWh/m^2/day, which is numerically equal to peak sun hours.
// Fetched: ${new Date().toISOString().slice(0, 10)}

export interface District {
  id: string
  name: string
  latitude: number
  longitude: number
  /** 12 entries, January first, in kWh/m2/day. */
  monthlyPsh: number[]
}

export const PSH_SOURCE = {
  name: 'NASA POWER climatology (ALLSKY_SFC_SW_DWN)',
  url: 'https://power.larc.nasa.gov/',
  fetchedOn: '${new Date().toISOString().slice(0, 10)}',
} as const

export const DISTRICTS: District[] = [
${rows.join('\n')}
]

export function findDistrict(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id)
}

export function worstMonthPsh(district: District): number {
  return Math.min(...district.monthlyPsh)
}

export function annualMeanPsh(district: District): number {
  const total = district.monthlyPsh.reduce((sum, v) => sum + v, 0)
  return Math.round((total / district.monthlyPsh.length) * 100) / 100
}
`
  writeFileSync(new URL('../src/data/psh.ts', import.meta.url), file, 'utf8')
  console.log(`wrote ${DISTRICT_CAPITALS.length} districts`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
