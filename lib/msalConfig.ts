import type { Configuration } from "@azure/msal-browser";

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? ""; // nullish: null, undefined, 0, false, ""
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? ""; // nullish: null, undefined, 0, false, ""

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "/", // During SSR (Server-side Rendering): window doesn't exist → typeof window = "undefined"
                                                                               // During CSR (Client-side Rendering): window exists → typeof window = "object"
    postLogoutRedirectUri:
      typeof window !== "undefined" ? window.location.origin : "/",
  },
  cache: {
    cacheLocation: "sessionStorage" as const, // Store tokens in sessionStorage (could be "localStorage", "memoryStorage" for persistence)
  },
};

export const loginRequest = {
  scopes: ["User.Read"],  // Read user profile from Graph
};
