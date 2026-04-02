import type { PropsWithChildren, ReactNode } from 'react';
import { Component } from 'react';

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<PropsWithChildren<{ fallback?: ReactNode }>, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="section-shell">
            <div className="card-shell rounded-[30px] px-8 py-16 text-center text-ink-500">
              Something went wrong while rendering this page.
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
