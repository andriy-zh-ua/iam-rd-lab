"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InteractionStatus } from "@azure/msal-browser";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  // MSAL is still figuring out the current state (startup or handling a redirect).
  // Don't redirect during this window — we don't know the answer yet.
  const isInitializing =
    inProgress === InteractionStatus.Startup ||
    inProgress === InteractionStatus.HandleRedirect;

  // If MSAL is still initializing or the user is not authenticated, redirect to the login page
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      // Automatically redirect to the login page if the user is not authenticated
      router.replace("/");
    }
  }, [isInitializing, isAuthenticated, router]);

  // Show loading state while MSAL is initializing
  if (isInitializing) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </main>
    );
  }

  // If the user is not authenticated, show a redirecting message
  if (!isAuthenticated) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Redirecting…</p>
      </main>
    );
  }

  // If the user is authenticated, render the children
  return <>{children}</>;
}
