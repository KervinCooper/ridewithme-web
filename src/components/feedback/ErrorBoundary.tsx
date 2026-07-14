"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught an error:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center p-6">
          <Card className="flex max-w-sm flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold uppercase italic text-text">
                {this.props.fallbackTitle ?? "Something went wrong"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Try again, or reload the app if this keeps happening.
              </p>
            </div>
            <Button variant="secondary" onClick={this.handleReset}>
              Try Again
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
