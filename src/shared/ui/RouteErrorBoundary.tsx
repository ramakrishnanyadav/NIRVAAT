import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Route Error Boundary: ${this.props.routeName ?? 'unknown'}]`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          aria-live="assertive"
          className="my-8 mx-auto max-w-lg p-6 rounded-2xl bg-white/90 border border-red-200 shadow-xl text-center space-y-4"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center text-red-700">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              Something went wrong loading {this.props.routeName ?? 'this view'}
            </h2>
            <p className="text-sm text-slate-600">
              {this.state.error?.message || 'A client-side error occurred while rendering.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800 text-white font-medium text-sm hover:bg-teal-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Reload this section
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
