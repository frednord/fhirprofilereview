import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
  /** Bumped on reset so the page remounts with empty inputs instead of rerendering the input that failed. */
  attempt: number
}

/**
 * Last line of defence: without it, an exception during rendering unmounts the
 * whole app and leaves a blank page. Known causes are handled in src/core; this
 * catches whatever input still slips through.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false, attempt: 0 }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Only the error and component stack are logged, never the pasted resources.
    console.error(error.message, info.componentStack)
  }

  private reset = (): void => {
    this.setState((state) => ({ failed: false, attempt: state.attempt + 1 }))
  }

  override render() {
    if (!this.state.failed) return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>
    return (
      <div role="alert" className="mx-auto max-w-xl space-y-3 px-4 py-12 text-slate-800">
        <h1 className="text-lg font-semibold">Något gick fel</h1>
        <p>Jämförelsen kunde inte visas, troligen på grund av ovanlig indata. Inget har skickats någonstans.</p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
        >
          Börja om med tomma fält
        </button>
      </div>
    )
  }
}
