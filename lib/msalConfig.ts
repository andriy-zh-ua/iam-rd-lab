import type { Configuration } from "@azure/msal-browser";

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "";
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "";

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "/",
    postLogoutRedirectUri:
      typeof window !== "undefined" ? window.location.origin : "/",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};
