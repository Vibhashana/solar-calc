import type { Dispatch } from 'react'
import type { Action, AppState } from '../../state/appState'
import { StepSystemType } from './StepSystemType'
import { StepLocation } from './StepLocation'
import { StepUsage } from './StepUsage'
import { StepPreferences } from './StepPreferences'

export interface StepProps {
  state: AppState
  dispatch: Dispatch<Action>
}

export interface StepDefinition {
  id: string
  title: string
  /** Short form for the progress strip, where the full title will not fit. */
  shortTitle: string
  /**
   * True when the step needs more room than a column of prose. Only the usage
   * step does: its appliance rows are a table, and a table squeezed into a
   * reading measure is the layout this replaced.
   */
  wide?: boolean
  Component: (props: StepProps) => JSX.Element
}

// The titles are final: the Wizard renders them as the page heading and focus
// target.
export const STEPS: StepDefinition[] = [
  { id: 'system-type', title: 'What are you building?', shortTitle: 'System', Component: StepSystemType },
  { id: 'location', title: 'Where are you?', shortTitle: 'Location', Component: StepLocation },
  { id: 'usage', title: 'Your usage', shortTitle: 'Usage', wide: true, Component: StepUsage },
  { id: 'preferences', title: 'Preferences', shortTitle: 'Preferences', Component: StepPreferences },
]
