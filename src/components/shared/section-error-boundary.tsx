"use client";

import { Component, type ReactNode } from "react";

import { FetchError } from "@/components/shared/fetch-error";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Catches a render crash in one settings-page tab (or any other section)
 * without taking the rest of the page down with it — a bug in, say, the
 * subscription tab's agent card used to crash past the page's own error
 * boundary, which made every *other* tab look broken too even though only
 * one tab's data ever triggered it. A `key` prop from the caller (e.g. the
 * section's own title) lets switching back and retrying reset this.
 *
 * Shows the error's own message under the fallback (small, muted) — there's
 * no way to reach the browser console remotely, so this is the only way a
 * report back ever carries the actual exception instead of a guess.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <FetchError onRetry={() => this.setState({ hasError: false })} />
          {this.state.message && (
            <p
              className="mt-2 text-center text-xs text-muted-foreground"
              dir="ltr"
            >
              {this.state.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
