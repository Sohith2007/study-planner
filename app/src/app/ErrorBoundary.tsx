import { Component, type ErrorInfo, type ReactNode } from 'react'
import { PageError } from '@/components/ui'

interface State {
  error: Error | null
}

/** Page-level error boundary: renders `page-error` inside <main>, so the nav stays usable. */
export class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('FocusPlan: page crashed', error, info.componentStack)
  }

  render() {
    if (this.state.error) return <PageError />
    return this.props.children
  }
}
