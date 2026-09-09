import type { Dispatch } from 'react'
import type { SystemDesign } from '../../engine/types'
import type { Action, AppState } from '../../state/appState'
import { formatFigure } from '../format'
import { Term } from '../primitives/Term'
import { ShowTheMaths } from './ShowTheMaths'
import { SystemCard } from './SystemCard'
import { Warnings } from './Warnings'
import styles from './Results.module.css'

interface ResultsProps {
  design: SystemDesign
  state: AppState
  dispatch: Dispatch<Action>
}

export function Results({ design }: ResultsProps) {
  const { array, inverter, battery, controller, busVoltage } = design

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <h2 className={styles.heading}>Your system</h2>

        <div className={styles.cards}>
          <SystemCard
            title="Panels"
            figure={formatFigure(array.panelCount.value)}
            unit={array.panelCount.value === 1 ? 'panel' : 'panels'}
            sentence={`That is ${formatFigure(array.installedPvKw.value)} kW of solar, needing about ${formatFigure(array.roofAreaM2.value)} m² of roof.`}
            field={array.panelCount}
          />

          {battery && busVoltage && (
            <SystemCard
              title="Battery"
              figure={formatFigure(battery.nominalKwh.value)}
              unit="kWh"
              sentence={
                <>
                  A {formatFigure(busVoltage.value)} V bank, which is the <Term id="bus-voltage" /> this size of
                  system runs at.
                </>
              }
              field={battery.nominalKwh}
            />
          )}

          <SystemCard
            title="Inverter"
            figure={formatFigure(inverter.continuousW.value)}
            unit="W"
            sentence={
              <>
                It also has to survive a {formatFigure(inverter.surgeRequiredW.value)} W <Term id="surge" /> when
                motors start.
              </>
            }
            field={inverter.continuousW}
          />

          {controller && (
            <SystemCard
              title="Charge controller"
              figure={formatFigure(controller.amps.value)}
              unit="A"
              sentence={
                <>
                  An <Term id={controller.type.value === 'MPPT' ? 'mppt' : 'pwm'} /> type, sized for the current
                  the panels can push into the battery.
                </>
              }
              field={controller.amps}
            />
          )}
        </div>

        <Warnings warnings={design.warnings} />
        <ShowTheMaths design={design} />
      </div>
    </div>
  )
}
