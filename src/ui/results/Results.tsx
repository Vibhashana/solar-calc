import type { Dispatch } from 'react'
import type { SystemDesign } from '../../engine/types'
import type { Action, AppState } from '../../state/appState'
import { formatFigure } from '../format'
import { Term } from '../primitives/Term'
import { InputSidebar } from './InputSidebar'
import { ShowTheMaths } from './ShowTheMaths'
import { SystemCard } from './SystemCard'
import { Warnings } from './Warnings'
import styles from './Results.module.css'

interface ResultsProps {
  design: SystemDesign
  state: AppState
  dispatch: Dispatch<Action>
}

export function Results({ design, state, dispatch }: ResultsProps) {
  const { array, inverter, battery, batteryModule, controller, busVoltage } = design
  const batteryBoxes =
    battery ? battery.modulesInSeries.value * battery.modulesInParallel.value : 0

  return (
    <div className={styles.layout}>
      {/* The design first, the inputs after. On a phone the two stack, and a
          reader who has just pressed "See my system" should land on the system,
          not on a second pass through their own answers. */}
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
                  {batteryModule && batteryBoxes > 0 && (
                    <> That is {formatFigure(batteryBoxes)} x {batteryModule.name}.</>
                  )}
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
              inverter.surgeRequiredW.value > 0 ? (
                <>
                  It also has to survive a {formatFigure(inverter.surgeRequiredW.value)} W <Term id="surge" /> when
                  motors start.
                </>
              ) : (
                <>
                  It does not need to survive a <Term id="surge" /> — the grid starts your motors, not the
                  inverter.
                </>
              )
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

      <InputSidebar state={state} dispatch={dispatch} chosenBatteryName={batteryModule?.name} />
    </div>
  )
}
