"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InteractionStatus } from "@azure/msal-browser";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";

import { loginRequest } from "@/lib/msalConfig";

const primaryBtn =
  "h-11 rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";

export default function LoginPage() {
  const router = useRouter(); // Get Next.js router for navigation
  const { instance, inProgress } = useMsal(); // Get MSAL instance and interaction state
  const isAuthenticated = useIsAuthenticated(); // Get authentication status
  
  const isBusy = inProgress !== InteractionStatus.None; // Check if MSAL is busy

  // If user lands on / already authenticated (returned from sign-in redirect, or
  // navigated here while signed in), bounce them to /dashboard.
  useEffect(() => {
    if (isAuthenticated && inProgress === InteractionStatus.None) {
      // Automatically redirect to the dashboard when detection of authentication is complete
      router.replace("/dashboard");
    }
  }, [isAuthenticated, inProgress, router]);

  const handleSignIn = async () => {
    if (isBusy) return;
    try {
      // Generates a random code_verifier (43–128 URL-safe chars),
      // computes SHA-256(verifier),
      // base64url-encodes the resulting 32-byte hash to produce the code_challenge (~43 chars),
      // and sends the challenge to Microsoft's /authorize endpoint.
      // The verifier is kept in sessionStorage and sent later, when the authorization code is exchanged for tokens at /token.
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      const code = (err as { errorCode?: string })?.errorCode;
      if (code === "interaction_in_progress") {
        await instance.clearCache();
        await instance.loginRedirect(loginRequest);
        return;
      }
      console.error(err);
    }
  };

  // Brief flash while the post-sign-in redirect to /dashboard fires.
  if (isAuthenticated) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Redirecting to dashboard…
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          IAM-RD-Lab
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
          Sign in with your Microsoft account to continue.
        </p>
        <button
          onClick={handleSignIn}
          disabled={isBusy}
          className={`w-full ${primaryBtn}`}
        >
          {isBusy ? "Working…" : "Sign in with Microsoft"}
        </button>
      </div>
    </main>
  );
}
