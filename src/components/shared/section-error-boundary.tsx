"use client";

import { Component, type ReactNode } from "react";

import { FetchError } from "@/components/shared/fetch-error";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches a render crash in one settings-page tab (or any other section)
 * without taking the rest of the page down with it — a bug in, say, the
 * subscription tab's agent card used to crash past the page's own error
 * boundary, which made every *other* tab look broken too even though only
 * one tab's data ever triggered it. A `key` prop from the caller (e.g. the
 * section's own title) lets switching back and retrying reset this.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <FetchError onRetry={() => this.setState({ hasError: false })} />
      );
    }
    return this.props.children;
  }
}
