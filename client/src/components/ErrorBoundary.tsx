import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from './ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-destructive/30 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto p-3 bg-destructive/10 text-destructive rounded-full w-12 h-12 flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Application Interface Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-xs text-muted-foreground">
                An unexpected interface exception occurred. The underlying cryptographic database state remains secure.
              </p>
              {this.state.error && (
                <div className="p-2.5 bg-muted rounded font-mono text-[11px] text-destructive text-left overflow-x-auto border">
                  {this.state.error.message}
                </div>
              )}
              <Button
                className="w-full text-xs gap-2"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload Application
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
