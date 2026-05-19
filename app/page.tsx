"use client";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "@/lib/msalConfig";

export default function Home() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const isBusy = inProgress !== InteractionStatus.None;

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

  const handleSignOut = () => {
    if (isBusy) return;
    instance.logoutRedirect().catch(console.error);
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          IAM-RD-Lab
        </h1>

        {isAuthenticated ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Signed in as{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {accounts[0]?.name ?? accounts[0]?.username ?? "unknown user"}
              </span>
            </p>
            <button
              onClick={handleSignOut}
              disabled={isBusy}
              className="w-full h-11 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? "Working…" : "Sign out"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Sign in with your Microsoft account to continue.
            </p>
            <button
              onClick={handleSignIn}
              disabled={isBusy}
              className="w-full h-11 rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? "Working…" : "Sign in with Microsoft"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
