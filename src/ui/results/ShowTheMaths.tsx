import type { Sized, SystemDesign } from '../../engine/types'
import { formatFigure } from '../format'
import styles from './ShowTheMaths.module.css'

interface CollectedField {
  group: string
  label: string
  field: Sized<unknown>
}

/** Every explained value in a design, in the order the engine derives them. */
export function collectSizedFields(design: SystemDesign): CollectedField[] {
  const fields: CollectedField[] = [
    { group: 'Your usage', label: 'Energy per day', field: design.load.dailyKwh },
    { group: 'Your usage', label: 'Used during the day', field: design.load.dayKwh },
    { group: 'Your usage', label: 'Used at night', field: design.load.nightKwh },
    { group: 'Your usage', label: 'Peak demand', field: design.load.continuousPeakW },
    { group: 'Your usage', label: 'Startup surge', field: design.load.surgePeakW },
    { group: 'Panels', label: 'Sun hours used', field: design.array.designPsh },
    { group: 'Panels', label: 'Losses', field: design.array.derateTotal },
    { group: 'Panels', label: 'Solar needed', field: design.array.requiredPvKw },
    { group: 'Panels', label: 'Panel count', field: design.array.panelCount },
    { group: 'Panels', label: 'Installed size', field: design.array.installedPvKw },
    { group: 'Panels', label: 'Roof area', field: design.array.roofAreaM2 },
    { group: 'Inverter', label: 'Continuous rating', field: design.inverter.continuousW },
    { group: 'Inverter', label: 'Surge required', field: design.inverter.surgeRequiredW },
  ]

  if (design.busVoltage) {
    fields.push({ group: 'Battery', label: 'System voltage', field: design.busVoltage })
  }
  if (design.battery) {
    fields.push(
      { group: 'Battery', label: 'Usable energy', field: design.battery.usableKwh },
      { group: 'Battery', label: 'Battery size', field: design.battery.nominalKwh },
      { group: 'Battery', label: 'Bank capacity', field: design.battery.bankAh },
      { group: 'Battery', label: 'Modules in series', field: design.battery.modulesInSeries },
      { group: 'Battery', label: 'Modules in parallel', field: design.battery.modulesInParallel },
    )
  }
  if (design.controller) {
    fields.push(
      { group: 'Charge controller', label: 'Current rating', field: design.controller.amps },
      { group: 'Charge controller', label: 'Controller type', field: design.controller.type },
      { group: 'Charge controller', label: 'Highest panel voltage', field: design.controller.maxStringVoc },
    )
  }

  return fields
}

export function ShowTheMaths({ design }: { design: SystemDesign }) {
  const fields = collectSizedFields(design)

  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Show me the maths</summary>
      <dl className={styles.list}>
        {fields.map(({ group, label, field }) => (
          <div key={`${group}-${label}`} className={styles.row}>
            <dt className={styles.label}>
              {group} — {label}
            </dt>
            <dd className={styles.body}>
              <p className={styles.value}>
                {typeof field.value === 'number' ? formatFigure(field.value) : String(field.value)} {field.unit}
              </p>
              <p>{field.explain.plain}</p>
              <code className={styles.code}>{field.explain.formula}</code>
              <code className={styles.code}>{field.explain.substituted}</code>
              {field.explain.assumptions.length > 0 && (
                <ul className={styles.assumptions}>
                  {field.explain.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
