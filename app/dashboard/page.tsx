"use client";

import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import {
  InteractionStatus,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const primaryBtn =
  "h-11 rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtn =
  "h-11 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";

export default function Dashboard() {
  const { instance, accounts, inProgress } = useMsal();
  const isBusy = inProgress !== InteractionStatus.None;

  const [output, setOutput] = useState<{ label: string; data: unknown } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = () => {
    if (isBusy) return;
    instance.logoutRedirect().catch(console.error);
  };

  // Silent token acquisition with interactive fallback (standard MSAL pattern).
  // - First tries the cache; if expired, MSAL uses the refresh token silently.
  // - Falls back to acquireTokenRedirect only if the user must consent
  //   (e.g., new scope, MFA required, conditional access).
  const getToken = async (scopes: string[]) => {
    const account = accounts[0];
    if (!account) throw new Error("No signed-in account");
    try {
      return await instance.acquireTokenSilent({ scopes, account });
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({ scopes, account });
        throw new Error("Redirecting for interactive consent…");
      }
      throw e;
    }
  };

  const showTokenInfo = async () => {
    setError(null);
    setOutput(null);
    try {
      const r = await getToken(["User.Read"]);
      setOutput({
        label: "Access token (acquireTokenSilent for User.Read)",
        data: {
          accessTokenPreview: r.accessToken.slice(0, 40) + "…",
          accessTokenLength: r.accessToken.length,
          tokenType: r.tokenType,
          scopes: r.scopes,
          expiresOn: r.expiresOn?.toISOString(),
          fromCache: r.fromCache,
          account: r.account?.username,
        },
      });
    } catch (e) {
      setError(String(e));
    }
  };

  const getProfile = async () => {
    setError(null);
    setOutput(null);
    try {
      const { accessToken } = await getToken(["User.Read"]);
      const res = await fetch(`${GRAPH_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(
          `Graph ${res.status} ${res.statusText}: ${await res.text()}`
        );
      }
      setOutput({ label: "Microsoft Graph /me", data: await res.json() });
    } catch (e) {
      setError(String(e));
    }
  };

  const getGroups = async () => {
    setError(null);
    setOutput(null);
    try {
      const { accessToken } = await getToken(["GroupMember.Read.All"]);
      const res = await fetch(`${GRAPH_BASE}/me/memberOf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(
          `Graph ${res.status} ${res.statusText}: ${await res.text()}`
        );
      }
      setOutput({
        label: "Microsoft Graph /me/memberOf",
        data: await res.json(),
      });
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 text-center">
          Dashboard
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
          Signed in as{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {accounts[0]?.name ?? accounts[0]?.username ?? "unknown user"}
          </span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={showTokenInfo}
            disabled={isBusy}
            className={secondaryBtn}
          >
            Show token info
          </button>
          <button
            onClick={getProfile}
            disabled={isBusy}
            className={secondaryBtn}
          >
            Get my profile
          </button>
          <button
            onClick={getGroups}
            disabled={isBusy}
            className={secondaryBtn}
          >
            Get my groups
          </button>
          <button
            onClick={handleSignOut}
            disabled={isBusy}
            className={primaryBtn}
          >
            {isBusy ? "Working…" : "Sign out"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-900 dark:text-red-200 break-words">
            <div className="font-semibold mb-1">Error</div>
            <div className="whitespace-pre-wrap font-mono text-xs">{error}</div>
          </div>
        )}

        {output && (
          <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 overflow-auto max-h-96">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {output.label}
            </div>
            <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
              {JSON.stringify(output.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
