/**
 * src/core/error-boundary.tsx
 * ─────────────────────────────────────────────────────────────
 * Reusable error boundary with Ficium styling.
 * Wrap any major section — a crash in one module doesn't take down others.
 *
 * Usage:
 *   <ErrorBoundary name="Dashboard">
 *     <Dashboard />
 *   </ErrorBoundary>
 */
import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { captureError } from "./sentry";

type Props = {
  children: ReactNode;
  name?: string;             // for logging/identification
  fallback?: ReactNode;      // optional custom fallback UI
};

type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureError(error, {
      boundary:     this.props.name ?? "unknown",
      componentStack: info.componentStack ?? "",
    });
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-white rounded-2xl border border-red-100 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 grid place-items-center mb-4">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <p className="font-display text-[16px] font-bold text-ink mb-1">
          Something went wrong
        </p>
        <p className="text-[13px] text-muted mb-5 max-w-[280px]">
          {this.props.name
            ? `The ${this.props.name} section failed to load.`
            : "This section failed to load."}
        </p>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-2 bg-ficium text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:bg-ficium-deep transition-colors"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    );
  }
}
