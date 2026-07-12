import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("Pink Petals Planner crashed:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-6xl">🥀</div>
        <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>
          Oh petal, something wilted
        </h1>
        <p className="muted max-w-sm">
          An unexpected error occurred. Your data is safe — try refreshing the
          garden.
        </p>
        {this.state.message && (
          <code className="max-w-sm overflow-auto rounded-xl bg-black/5 px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {this.state.message}
          </code>
        )}
        <button
          className="btn mt-2"
          onClick={() => {
            this.handleReset();
            window.location.reload();
          }}
        >
          Refresh
        </button>
      </div>
    );
  }
}
