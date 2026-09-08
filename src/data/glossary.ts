/** Plain definitions for every term the interface is allowed to use. */
export interface GlossaryEntry {
  term: string
  definition: string
}

export const GLOSSARY = {
  mppt: {
    term: 'MPPT',
    definition:
      'A smarter type of controller that squeezes more power out of the same panels, especially on cloudy days and cold mornings. It costs more than the simple type and is worth it on all but the smallest systems.',
  },
  pwm: {
    term: 'PWM',
    definition:
      'The simple, cheaper type of controller. It works well when the panels and the battery are closely matched in voltage, and wastes power when they are not.',
  },
  'peak-sun-hours': {
    term: 'peak sun hours',
    definition:
      'A way of summing up a whole day of sunshine as a number of hours of strong, midday-quality sun. Four peak sun hours means the day produced as much energy as four hours of bright noon sun.',
  },
  'depth-of-discharge': {
    term: 'depth of discharge',
    definition:
      'How much of a battery you actually use before recharging it. Batteries last longer if you leave some in reserve, so the usable size is smaller than the size printed on the box.',
  },
  autonomy: {
    term: 'days of autonomy',
    definition:
      'How many days the battery should keep the house running with no useful sun at all. More days means a bigger, more expensive battery.',
  },
  'bus-voltage': {
    term: 'system voltage',
    definition:
      'The voltage the battery and the rest of the system run at. Bigger systems use a higher voltage so that the same power flows as less current, which allows thinner, cheaper cable.',
  },
  surge: {
    term: 'surge',
    definition:
      'The brief spike of power some appliances draw the moment they switch on. A fridge or a pump can pull several times its normal power for a second or two, and the inverter has to survive that.',
  },
  voc: {
    term: 'open-circuit voltage',
    definition:
      'The highest voltage a panel can produce, which happens on a cold morning before anything is drawing power. Equipment has to be rated above it or it can be damaged.',
  },
  derate: {
    term: 'losses',
    definition:
      'The gap between what panels produce in a laboratory and what they produce on your roof. Dust, heat, cable resistance and conversion losses all take a share.',
  },
  inverter: {
    term: 'inverter',
    definition:
      'The box that turns the low-voltage electricity from panels and batteries into the mains electricity your appliances expect.',
  },
  'charge-controller': {
    term: 'charge controller',
    definition:
      'The box between the panels and the battery. It decides how fast to charge and stops the battery being overfilled.',
  },
  lifepo4: {
    term: 'LiFePO4',
    definition:
      'The battery chemistry this tool sizes for. It lasts far longer than the older lead-acid type, tolerates being emptied further, and needs no topping up with water.',
  },
} as const satisfies Record<string, GlossaryEntry>

export type TermId = keyof typeof GLOSSARY
