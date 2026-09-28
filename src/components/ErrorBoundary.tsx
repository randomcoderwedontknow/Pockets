import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Pockets]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Something went wrong</h2>
        <p className="text-secondary" style={{ margin: '12px 0 20px' }}>
          Pockets hit an unexpected error. Your data is still on this device.
        </p>
        <Button
          onClick={() => {
            this.setState({ error: null });
            if (window.history.length > 1) window.history.back();
            else window.location.assign('/');
          }}
        >
          Go back
        </Button>
      </div>
    );
  }
}
