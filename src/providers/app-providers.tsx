"use client";

import { useState, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { ToastStack } from "@/components/shared/toast-stack";
import { PushNotificationsPromptModal } from "@/features/notifications/components/push-prompt-modal";
import { NavigationLoadingProvider } from "@/providers/navigation-loading";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
        <ToastStack />
        <PushNotificationsPromptModal />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
