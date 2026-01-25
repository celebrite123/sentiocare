import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to external service in production (placeholder for Sentry/etc)
    if (import.meta.env.PROD) {
      // Future: Send to error tracking service
      console.error("Production error logged:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 rounded-lg bg-muted text-sm font-mono overflow-auto max-h-32">
                  <p className="text-destructive font-semibold">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                      {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                If this keeps happening, please contact{" "}
                <a href="mailto:info@sentio.in.net" className="text-primary hover:underline">
                  support
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
