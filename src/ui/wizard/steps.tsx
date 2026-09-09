import type { Dispatch } from 'react'
import type { Action, AppState } from '../../state/appState'
import { StepSystemType } from './StepSystemType'
import { StepLocation } from './StepLocation'
import { StepUsage } from './StepUsage'

export interface StepProps {
  state: AppState
  dispatch: Dispatch<Action>
}

export interface StepDefinition {
  id: string
  title: string
  Component: (props: StepProps) => JSX.Element
}

// Tasks 8-11 replace each Component below with the real screen. The titles are
// final: the Wizard renders them as the page heading and focus target.
export const STEPS: StepDefinition[] = [
  { id: 'system-type', title: 'What are you building?', Component: StepSystemType },
  { id: 'location', title: 'Where are you?', Component: StepLocation },
  { id: 'usage', title: 'Your usage', Component: StepUsage },
  { id: 'preferences', title: 'Preferences', Component: () => <p /> },
]
