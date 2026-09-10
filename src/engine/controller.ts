import { DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { BusVoltage, ControllerSpec, ControllerType, PanelSpec } from './types'

const STC_TEMPERATURE_C = 25

export function sizeController(
  installedPvKw: number,
  busVoltage: BusVoltage,
  panel: PanelSpec,
  panelCount: number,
  minAmbientC: number,
): ControllerSpec {
  const arrayW = installedPvKw * 1000
  const amps = (arrayW / busVoltage) * DEFAULTS.controller.headroom

  const type: ControllerType = arrayW > DEFAULTS.controller.mpptThresholdW ? 'MPPT' : 'PWM'

  const degreesBelowStc = STC_TEMPERATURE_C - minAmbientC
  const vocRise = 1 + (Math.abs(panel.vocTempCoefficientPctPerC) / 100) * degreesBelowStc
  const maxStringVoc = panel.vocVolts * panelCount * vocRise

  return {
    amps: sized(amps, 'A', {
      plain: `The charge controller must handle at least ${round2(amps)} amps. Buy the next size up that you can find — controllers are usually sold as 30 A, 40 A, 60 A, 80 A or 100 A.`,
      formula: 'amps = (arrayW / busVoltage) x headroom',
      substituted: `(${round2(arrayW)} / ${busVoltage}) x ${DEFAULTS.controller.headroom} = ${round2(amps)} A`,
      assumptions: [`${Math.round((DEFAULTS.controller.headroom - 1) * 100)}% margin for bright, cool days when panels exceed their rating.`],
    }),
    type: sized(type, '', {
      plain:
        type === 'MPPT'
          ? `Use an MPPT controller. It converts the panels' higher voltage down to battery voltage instead of wasting the difference, which typically recovers 20-30% more energy. At ${round2(arrayW)} watts that difference is worth far more than the extra cost.`
          : `A simple PWM controller is fine at this size. MPPT controllers recover more energy, but on an array of only ${round2(arrayW)} watts the saving would not repay the extra cost.`,
      formula: `type = arrayW > ${DEFAULTS.controller.mpptThresholdW} ? 'MPPT' : 'PWM'`,
      substituted: `type = ${type} (array is ${round2(arrayW)} W)`,
      assumptions: [`MPPT is worth its cost above about ${DEFAULTS.controller.mpptThresholdW} W.`],
    }),
    maxStringVoc: sized(maxStringVoc, 'V', {
      plain: `On the coldest morning your panels could reach ${round2(maxStringVoc)} volts with nothing connected. The controller's maximum input voltage must be higher than this, or it will be damaged. Panels produce more voltage when cold, which catches people out.`,
      formula: 'maxStringVoc = panelVoc x panelCount x (1 + |tempCoefficient| / 100 x (25 - minAmbientC))',
      substituted: `${round2(panel.vocVolts)} x ${panelCount} x ${round2(vocRise)} = ${round2(maxStringVoc)} V`,
      assumptions: [
        `Coldest expected temperature of ${minAmbientC} °C.`,
        'All panels wired in a single series string — wiring them in two strings halves this voltage.',
      ],
    }),
  }
}
