import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CRITICAL_ERROR_BOUNDARY] Caught unhandled React exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard/doctor';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[480px] w-full flex items-center justify-center p-6 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
          <div className="max-w-lg w-full p-8 rounded-3xl bg-slate-900/90 border border-rose-500/30 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-wide">
                {this.props.fallbackTitle || 'Workstation Interface Recovered'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                A temporary rendering exception occurred while processing this clinical view. Your session and patient data remain secure.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-32 custom-scrollbar">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-navy-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-accent/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload View</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-gray-300" />
                <span>Return to Doctor Workstation</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
