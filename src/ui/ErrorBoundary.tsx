import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset: () => void
}

interface State {
  failed: boolean
}

/** Parent §8 tier 3: sizeSystem throws only on impossible input. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Sizing failed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <section>
        <h2>This tool could not work out a system from those answers.</h2>
        <p>That is a fault in the tool, not in what you typed. Starting again with the usual answers should work.</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ failed: false })
            this.props.onReset()
          }}
        >
          Start over
        </button>
      </section>
    )
  }
}
