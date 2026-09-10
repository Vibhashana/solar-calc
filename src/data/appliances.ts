import type { Appliance } from '../engine/types'

/**
 * Typical wattages for the Sri Lankan domestic market. These are starting
 * points for planning, not measurements; every value is editable in the UI.
 * Surge factors express startup draw as a multiple of running watts.
 */
export const APPLIANCES: Appliance[] = [
  // Lighting
  { id: 'led-bulb', name: 'LED bulb', category: 'Lighting', watts: 9, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'led-tube', name: 'LED tube light', category: 'Lighting', watts: 20, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'cfl-bulb', name: 'CFL bulb', category: 'Lighting', watts: 20, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },

  // Cooling
  { id: 'ceiling-fan', name: 'Ceiling fan', category: 'Cooling', watts: 75, surgeFactor: 2, defaultHoursPerDay: 8, defaultUsageWindow: 'both' },
  { id: 'stand-fan', name: 'Stand fan', category: 'Cooling', watts: 55, surgeFactor: 2, defaultHoursPerDay: 6, defaultUsageWindow: 'both' },
  { id: 'air-conditioner-12k', name: 'Air conditioner (12,000 BTU)', category: 'Cooling', watts: 1100, surgeFactor: 3, defaultHoursPerDay: 6, defaultUsageWindow: 'night' },
  { id: 'air-conditioner-18k', name: 'Air conditioner (18,000 BTU)', category: 'Cooling', watts: 1700, surgeFactor: 3, defaultHoursPerDay: 6, defaultUsageWindow: 'night' },

  // Kitchen
  { id: 'fridge', name: 'Refrigerator', category: 'Kitchen', watts: 150, surgeFactor: 3, defaultHoursPerDay: 8, defaultUsageWindow: 'both' },
  { id: 'chest-freezer', name: 'Chest freezer', category: 'Kitchen', watts: 200, surgeFactor: 3, defaultHoursPerDay: 9, defaultUsageWindow: 'both' },
  { id: 'rice-cooker', name: 'Rice cooker', category: 'Kitchen', watts: 700, surgeFactor: 1, defaultHoursPerDay: 1, defaultUsageWindow: 'both' },
  { id: 'electric-kettle', name: 'Electric kettle', category: 'Kitchen', watts: 1500, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'both' },
  { id: 'microwave', name: 'Microwave oven', category: 'Kitchen', watts: 1200, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'both' },
  { id: 'blender', name: 'Blender / grinder', category: 'Kitchen', watts: 400, surgeFactor: 2, defaultHoursPerDay: 0.25, defaultUsageWindow: 'day' },

  // Laundry and water
  { id: 'washing-machine', name: 'Washing machine', category: 'Laundry & water', watts: 500, surgeFactor: 3, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
  { id: 'iron', name: 'Clothes iron', category: 'Laundry & water', watts: 1000, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'day' },
  { id: 'water-pump', name: 'Water pump', category: 'Laundry & water', watts: 750, surgeFactor: 4, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
  { id: 'water-heater', name: 'Instant water heater', category: 'Laundry & water', watts: 3000, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'both' },

  // Electronics
  { id: 'tv-led-32', name: 'LED television (32 in)', category: 'Electronics', watts: 60, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'tv-led-55', name: 'LED television (55 in)', category: 'Electronics', watts: 120, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'laptop', name: 'Laptop', category: 'Electronics', watts: 65, surgeFactor: 1, defaultHoursPerDay: 6, defaultUsageWindow: 'both' },
  { id: 'desktop-pc', name: 'Desktop computer', category: 'Electronics', watts: 250, surgeFactor: 1, defaultHoursPerDay: 6, defaultUsageWindow: 'both' },
  { id: 'wifi-router', name: 'Wi-Fi router', category: 'Electronics', watts: 12, surgeFactor: 1, defaultHoursPerDay: 24, defaultUsageWindow: 'both' },
  { id: 'phone-charger', name: 'Phone charger', category: 'Electronics', watts: 15, surgeFactor: 1, defaultHoursPerDay: 3, defaultUsageWindow: 'night' },

  // Workshop
  { id: 'power-tools', name: 'Power tools', category: 'Workshop', watts: 800, surgeFactor: 3, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
  { id: 'welding-machine', name: 'Welding machine', category: 'Workshop', watts: 3500, surgeFactor: 2, defaultHoursPerDay: 0.5, defaultUsageWindow: 'day' },
]

export function findAppliance(id: string): Appliance | undefined {
  return APPLIANCES.find((a) => a.id === id)
}
