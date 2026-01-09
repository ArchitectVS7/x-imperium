"use client";

/**
 * Error Boundary Component
 *
 * A reusable React error boundary for catching and handling component-level errors.
 * Wraps game components to prevent full page crashes and provide graceful degradation.
 *
 * @example
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 */

import React, { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to show when an error occurs */
  fallback?: ReactNode;
  /** Component name for better error logging */
  componentName?: string;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName, onError } = this.props;

    // Log error
    console.error(
      `Error in ${componentName || "component"}:`,
      error,
      errorInfo.componentStack
    );

    // Call optional error callback
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="p-4 bg-gray-900/50 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <span className="text-lg">!</span>
            <span className="font-medium">
              {componentName ? `${componentName} Error` : "Component Error"}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            This section encountered an error and couldn&apos;t be displayed.
          </p>

          {/* Error details in development */}
          {process.env.NODE_ENV === "development" && error && (
            <details className="mb-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                Details
              </summary>
              <pre className="mt-1 p-2 bg-gray-800 rounded text-xs text-red-400 overflow-auto max-h-24">
                {error.message}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleRetry}
            className="text-sm px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

/**
 * HOC to wrap a component with an error boundary
 *
 * @example
 * const SafeStarmap = withErrorBoundary(Starmap, "Starmap");
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.FC<P & { fallback?: ReactNode }> {
  const displayName =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    "Component";

  const ComponentWithErrorBoundary: React.FC<P & { fallback?: ReactNode }> = ({
    fallback,
    ...props
  }) => (
    <ErrorBoundary fallback={fallback} componentName={displayName}>
      <WrappedComponent {...(props as P)} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
