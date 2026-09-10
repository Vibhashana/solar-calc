// GENERATED FILE - DO NOT EDIT BY HAND.
// Regenerate with: npm run fetch:psh
//
// Source: NASA POWER, parameter ALLSKY_SFC_SW_DWN (climatology),
//         https://power.larc.nasa.gov/
// Units:  kWh/m^2/day, which is numerically equal to peak sun hours.
// Fetched: 2026-09-08

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
  fetchedOn: '2026-09-08',
} as const

export const DISTRICTS: District[] = [
  { id: 'colombo', name: 'Colombo', latitude: 6.93, longitude: 79.86, monthlyPsh: [5.64, 6.2, 6.47, 6.08, 5.3, 5.39, 5.48, 5.68, 5.66, 5.51, 4.95, 5.04] },
  { id: 'gampaha', name: 'Gampaha', latitude: 7.09, longitude: 80, monthlyPsh: [4.82, 5.66, 6.16, 5.84, 5.33, 5.12, 5.07, 5.2, 5.35, 5.12, 4.47, 4.19] },
  { id: 'kalutara', name: 'Kalutara', latitude: 6.58, longitude: 79.96, monthlyPsh: [5.64, 6.2, 6.47, 6.08, 5.3, 5.39, 5.48, 5.68, 5.66, 5.51, 4.95, 5.04] },
  { id: 'kandy', name: 'Kandy', latitude: 7.29, longitude: 80.63, monthlyPsh: [4.82, 5.66, 6.16, 5.84, 5.33, 5.12, 5.07, 5.2, 5.35, 5.12, 4.47, 4.19] },
  { id: 'matale', name: 'Matale', latitude: 7.47, longitude: 80.62, monthlyPsh: [4.82, 5.66, 6.16, 5.84, 5.33, 5.12, 5.07, 5.2, 5.35, 5.12, 4.47, 4.19] },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', latitude: 6.97, longitude: 80.79, monthlyPsh: [5.05, 5.62, 5.89, 5.5, 4.91, 4.9, 4.87, 4.97, 5.03, 4.87, 4.49, 4.47] },
  { id: 'galle', name: 'Galle', latitude: 6.05, longitude: 80.22, monthlyPsh: [5.05, 5.62, 5.89, 5.5, 4.91, 4.9, 4.87, 4.97, 5.03, 4.87, 4.49, 4.47] },
  { id: 'matara', name: 'Matara', latitude: 5.95, longitude: 80.54, monthlyPsh: [5.56, 6.12, 6.46, 6.1, 5.5, 5.47, 5.54, 5.69, 5.73, 5.59, 4.89, 5.03] },
  { id: 'hambantota', name: 'Hambantota', latitude: 6.12, longitude: 81.12, monthlyPsh: [4.94, 5.56, 6.12, 5.85, 5.63, 5.64, 5.64, 5.75, 5.71, 5.33, 4.52, 4.36] },
  { id: 'jaffna', name: 'Jaffna', latitude: 9.66, longitude: 80.02, monthlyPsh: [4.83, 5.71, 6.29, 6.18, 5.78, 5.77, 5.58, 5.72, 5.71, 5.03, 4.12, 4.03] },
  { id: 'kilinochchi', name: 'Kilinochchi', latitude: 9.4, longitude: 80.4, monthlyPsh: [4.83, 5.71, 6.29, 6.18, 5.78, 5.77, 5.58, 5.72, 5.71, 5.03, 4.12, 4.03] },
  { id: 'mannar', name: 'Mannar', latitude: 8.98, longitude: 79.9, monthlyPsh: [5.23, 6.04, 6.54, 6.33, 5.89, 5.88, 5.82, 5.98, 6.11, 5.43, 4.48, 4.38] },
  { id: 'vavuniya', name: 'Vavuniya', latitude: 8.75, longitude: 80.5, monthlyPsh: [4.66, 5.56, 6.15, 6.01, 5.68, 5.59, 5.55, 5.63, 5.66, 5.07, 4.17, 3.95] },
  { id: 'mullaitivu', name: 'Mullaitivu', latitude: 9.27, longitude: 80.81, monthlyPsh: [4.83, 5.71, 6.29, 6.18, 5.78, 5.77, 5.58, 5.72, 5.71, 5.03, 4.12, 4.03] },
  { id: 'batticaloa', name: 'Batticaloa', latitude: 7.71, longitude: 81.69, monthlyPsh: [4.42, 5.23, 6.09, 5.96, 5.86, 5.76, 5.72, 5.89, 5.84, 5.37, 4.34, 3.89] },
  { id: 'ampara', name: 'Ampara', latitude: 7.3, longitude: 81.67, monthlyPsh: [4.42, 5.23, 6.09, 5.96, 5.86, 5.76, 5.72, 5.89, 5.84, 5.37, 4.34, 3.89] },
  { id: 'trincomalee', name: 'Trincomalee', latitude: 8.59, longitude: 81.21, monthlyPsh: [4.71, 5.52, 6.24, 6.21, 5.77, 5.68, 5.6, 5.74, 5.76, 5.3, 4.31, 3.99] },
  { id: 'kurunegala', name: 'Kurunegala', latitude: 7.49, longitude: 80.36, monthlyPsh: [4.82, 5.66, 6.16, 5.84, 5.33, 5.12, 5.07, 5.2, 5.35, 5.12, 4.47, 4.19] },
  { id: 'puttalam', name: 'Puttalam', latitude: 8.03, longitude: 79.83, monthlyPsh: [5.23, 6.04, 6.54, 6.33, 5.89, 5.88, 5.82, 5.98, 6.11, 5.43, 4.48, 4.38] },
  { id: 'anuradhapura', name: 'Anuradhapura', latitude: 8.31, longitude: 80.4, monthlyPsh: [4.66, 5.56, 6.15, 6.01, 5.68, 5.59, 5.55, 5.63, 5.66, 5.07, 4.17, 3.95] },
  { id: 'polonnaruwa', name: 'Polonnaruwa', latitude: 7.94, longitude: 81, monthlyPsh: [4.42, 5.23, 6.09, 5.96, 5.86, 5.76, 5.72, 5.89, 5.84, 5.37, 4.34, 3.89] },
  { id: 'badulla', name: 'Badulla', latitude: 6.99, longitude: 81.06, monthlyPsh: [4.94, 5.56, 6.12, 5.85, 5.63, 5.64, 5.64, 5.75, 5.71, 5.33, 4.52, 4.36] },
  { id: 'monaragala', name: 'Monaragala', latitude: 6.87, longitude: 81.35, monthlyPsh: [4.94, 5.56, 6.12, 5.85, 5.63, 5.64, 5.64, 5.75, 5.71, 5.33, 4.52, 4.36] },
  { id: 'ratnapura', name: 'Ratnapura', latitude: 6.68, longitude: 80.4, monthlyPsh: [5.05, 5.62, 5.89, 5.5, 4.91, 4.9, 4.87, 4.97, 5.03, 4.87, 4.49, 4.47] },
  { id: 'kegalle', name: 'Kegalle', latitude: 7.25, longitude: 80.35, monthlyPsh: [4.82, 5.66, 6.16, 5.84, 5.33, 5.12, 5.07, 5.2, 5.35, 5.12, 4.47, 4.19] },
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
