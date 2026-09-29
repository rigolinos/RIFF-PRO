import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-danger/15 rounded-full flex items-center justify-center mb-6">
            <AlertOctagon className="w-10 h-10 text-danger" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Ops! Algo deu errado.</h1>
          <p className="text-muted-foreground max-w-sm mb-8">
            Tivemos um problema inesperado ao carregar esta página. Recarregue o aplicativo para tentar novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-brand hover:brightness-105 text-brand-ink px-6 py-3 rounded-xl font-bold transition-all glow-emerald"
          >
            <RefreshCw className="w-5 h-5" />
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
