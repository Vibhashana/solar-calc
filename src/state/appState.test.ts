import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../engine/defaults'
import { initialState, reducer, type AppState } from './appState'

function wizardStart(): AppState {
  return initialState()
}

describe('initialState', () => {
  it('starts the wizard when nothing was restored', () => {
    const state = wizardStart()
    expect(state.view).toBe('wizard')
    expect(state.step).toBe(0)
    expect(state.touched).toEqual([])
  })

  it('opens straight to results when inputs were restored', () => {
    const restored = defaultInputs('hybrid', 'colombo')
    expect(initialState(restored).view).toBe('results')
  })

  it('marks a restored field touched when it differs from the default', () => {
    const restored = { ...defaultInputs('off-grid', 'kandy'), autonomyDays: 3 }
    expect(initialState(restored).touched).toContain('autonomyDays')
  })

  it('leaves a restored field untouched when it matches the default', () => {
    const restored = defaultInputs('off-grid', 'kandy') // autonomyDays === 2
    expect(initialState(restored).touched).not.toContain('autonomyDays')
  })
})

describe('navigation', () => {
  it('moves forward through the four question screens', () => {
    let state = wizardStart()
    for (const expected of [1, 2, 3]) {
      state = reducer(state, { type: 'next' })
      expect(state.step).toBe(expected)
      expect(state.view).toBe('wizard')
    }
  })

  it('lands on results from the last screen', () => {
    let state = { ...wizardStart(), step: 3 }
    state = reducer(state, { type: 'next' })
    expect(state.view).toBe('results')
  })

  it('goes back, and never before the first screen', () => {
    let state = { ...wizardStart(), step: 1 }
    state = reducer(state, { type: 'back' })
    expect(state.step).toBe(0)
    state = reducer(state, { type: 'back' })
    expect(state.step).toBe(0)
  })

  it('restarts into a clean wizard', () => {
    const dirty = reducer({ ...wizardStart(), view: 'results' }, { type: 'setBill', monthlyKwh: 700 })
    const state = reducer(dirty, { type: 'restart' })
    expect(state.view).toBe('wizard')
    expect(state.step).toBe(0)
    expect(state.inputs.load).toEqual(defaultInputs('hybrid', 'colombo').load)
  })
})

describe('the touched rule', () => {
  it('re-applies the autonomy default when system type changes and the user has not set it', () => {
    let state = wizardStart() // hybrid, autonomy 0.5
    state = reducer(state, { type: 'setSystemType', systemType: 'off-grid' })
    expect(state.inputs.autonomyDays).toBe(2)
  })

  it('keeps an autonomy the user chose when system type changes', () => {
    let state = reducer(wizardStart(), { type: 'setAutonomyDays', days: 3 })
    expect(state.touched).toContain('autonomyDays')
    state = reducer(state, { type: 'setSystemType', systemType: 'off-grid' })
    expect(state.inputs.autonomyDays).toBe(3)
  })

  it('keeps a panel the user chose when system type changes', () => {
    let state = reducer(wizardStart(), { type: 'setPanel', panelId: 'generic-330' })
    state = reducer(state, { type: 'setSystemType', systemType: 'grid-tied' })
    expect(state.inputs.panelId).toBe('generic-330')
  })
})

describe('the load fork', () => {
  it('switches to an empty appliance list', () => {
    const state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    expect(state.inputs.load).toEqual({ mode: 'appliances', entries: [] })
  })

  it('switches back to the bill with its default night share', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    state = reducer(state, { type: 'setLoadMode', mode: 'bill' })
    expect(state.inputs.load).toEqual({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 })
  })

  it('adds an appliance seeded from its own defaults', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    state = reducer(state, { type: 'addAppliance', applianceId: 'led-bulb' })
    expect(state.inputs.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 1, hoursPerDay: 5, usageWindow: 'night' }],
    })
  })

  it('ignores an unknown appliance rather than adding a broken row', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    const before = state.inputs.load
    state = reducer(state, { type: 'addAppliance', applianceId: 'flux-capacitor' })
    expect(state.inputs.load).toEqual(before)
  })

  it('updates and removes a row by index', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    state = reducer(state, { type: 'addAppliance', applianceId: 'led-bulb' })
    state = reducer(state, { type: 'updateAppliance', index: 0, patch: { quantity: 6 } })
    expect(state.inputs.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 6, hoursPerDay: 5, usageWindow: 'night' }],
    })
    state = reducer(state, { type: 'removeAppliance', index: 0 })
    expect(state.inputs.load).toEqual({ mode: 'appliances', entries: [] })
  })

  it('ignores appliance edits while on the bill path', () => {
    const state = reducer(wizardStart(), { type: 'updateAppliance', index: 0, patch: { quantity: 6 } })
    expect(state.inputs.load).toEqual({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 })
  })
})

describe('purity', () => {
  it('never mutates the state it was given', () => {
    const before = wizardStart()
    const snapshot = structuredClone(before)
    reducer(before, { type: 'setBill', monthlyKwh: 999 })
    reducer(before, { type: 'setSystemType', systemType: 'off-grid' })
    expect(before).toEqual(snapshot)
  })
})
