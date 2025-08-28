import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-red-600">
                  Oops! Something went wrong 😞
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    {this.state.error?.message || 'An unexpected error occurred.'}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full"
                  >
                    🔄 Reload Page
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => this.setState({ hasError: false })}
                    className="w-full"
                  >
                    🔙 Try Again
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  If the problem persists, please contact support.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}