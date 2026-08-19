import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react'
import { UnexpectedErrorScreen } from '@/pages/errors/UnexpectedErrorScreen'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  retryKey: number
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryKey: 0 }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(error, info.componentStack)
    }
  }

  private retry = () => {
    this.setState((current) => ({ hasError: false, retryKey: current.retryKey + 1 }))
  }

  render() {
    if (this.state.hasError) {
      return <UnexpectedErrorScreen onRetry={this.retry} />
    }
    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>
  }
}
