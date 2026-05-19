# IAM-RD-Lab

**Personal R&D Project** — a secure enterprise sign-in application built
with **React / Next.js** and the **Microsoft Authentication Library
(MSAL)**, integrated with **Microsoft Entra ID**.

It demonstrates three things:

- **Identity protocol implementation** — the OAuth 2.0 / OpenID Connect
  authorization-code flow with PKCE, plus access and refresh token
  lifecycle management in the browser.
- **Resource API integration** — Microsoft Graph calls to retrieve user
  profile and group-membership data via delegated permissions.
- **Real security boundary** — server-side JWT validation against
  Microsoft's JWKS in a Next.js Route Handler, so the server doesn't
  have to trust the client's word about who the user is.

## What this app does

1. Lets a user sign in with their Microsoft Entra ID (work or school)
   account from a Single Page Application.
2. Performs the full OAuth 2.0 authorization-code flow with PKCE, entirely
   client-side, against `login.microsoftonline.com`.
3. Receives and caches an **access token**, **ID token**, and **refresh
   token**. Uses `acquireTokenSilent` for normal retrieval (cache → silent
   refresh via refresh token), and falls back to `acquireTokenRedirect`
   **interactive-consent flow** when MSAL throws `InteractionRequiredAuthError`
   (new scope requested, MFA required, conditional access claims challenge).
4. Exposes a protected `/dashboard` route guarded by a client-side
   `AuthGuard` component.
5. From the dashboard, the user can:
   - **Show token info** — inspect the current access token (preview, length,
     scopes, expiry, cache hit/miss, account).
   - **Get my profile** — call Microsoft Graph `GET /v1.0/me` with the access
     token as a Bearer credential, and render the JSON response.
   - **Get my groups** — call Microsoft Graph `GET /v1.0/me/memberOf` with the
     `GroupMember.Read.All` delegated permission, and render the JSON
     response.
   - **Validate ID token (server)** — send the current ID token to a
     Next.js Route Handler at `POST /api/validate`, which verifies the
     JWT signature against Microsoft's JWKS and checks `iss` / `aud` /
     `exp`. Returns the parsed claims if valid, `401` if not.
   - **Sign out** — clear the MSAL cache and log out at the IdP.

## Purpose

This is a learning / portfolio project demonstrating a working understanding
of enterprise identity flows:

- The OAuth 2.0 authorization-code flow with PKCE (the SPA-recommended flow
  per RFC 7636).
- OpenID Connect on top of OAuth 2.0 (ID token, scopes, claims).
- Token lifecycle management in the browser (cache, silent refresh,
  interactive consent fallback).
- Integration with Microsoft Graph using delegated permissions.
- Separation of public (login) and protected (dashboard) routes in a
  Next.js App Router application.
- Server-side JWT validation against the identity provider's JWKS — the
  pattern any real backend uses to trust a token coming from the browser.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.6** (App Router, Turbopack) |
| UI library | React **19.2.4** |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Auth (client) | `@azure/msal-browser ^5.10.1`, `@azure/msal-react ^5.4.1` |
| Auth (server) | `jose ^6.2.3` (JWT signature & claim verification with remote JWKS) |
| Identity provider | Microsoft Entra ID |
| Identity protocols | OAuth 2.0, OpenID Connect, PKCE (S256) |
| Resource API | Microsoft Graph v1.0 |

## How the authentication flow works

```
                    BROWSER                          MICROSOFT
                    ─────────                        ──────────

  1. Page load     Render /, MsalProvider initializes.

  2. Click Sign In loginRedirect() generates:
                     - random code_verifier (43-128 URL-safe chars)
                     - code_challenge = base64url(SHA-256(verifier))
                     - state, nonce
                   Stores verifier in sessionStorage, then navigates to:

                                  ──────────────►
                                                 /oauth2/v2.0/authorize?
                                                   client_id=...
                                                   response_type=code
                                                   redirect_uri=...
                                                   scope=openid profile
                                                         offline_access
                                                         User.Read
                                                   code_challenge=...
                                                   code_challenge_method=S256
                                                   state=..., nonce=...

  3. At Microsoft                                User authenticates (+ MFA),
                                                 first time: consent screen.
                                                 IdP issues authorization code.

                                  ◄──────── 302
                                  /?code=...&state=...

  4. Back at /     MsalProvider.handleRedirectPromise():
                     - reads code from URL
                     - reads verifier from sessionStorage
                     - POSTs to /oauth2/v2.0/token:
                         grant_type=authorization_code
                         code=...
                         code_verifier=...   ◄── PKCE proof
                         redirect_uri=...

                                  ──────────────►
                                                 Validates SHA-256(verifier)
                                                 equals stored challenge.

                                  ◄──────── tokens
                                  { access_token, id_token, refresh_token,
                                    expires_in }

  5. App finishes  Tokens cached in sessionStorage.
                   useIsAuthenticated() returns true.
                   useEffect on / redirects to /dashboard.

  6. Calling Graph acquireTokenSilent({ scopes }) returns cached token,
                   or uses the refresh token silently to get a new one,
                   or throws InteractionRequiredAuthError → redirect for
                   interactive consent.

                   fetch('https://graph.microsoft.com/v1.0/me', {
                     headers: { Authorization: `Bearer ${accessToken}` }
                   })
```

## How server-side token validation works

```
Browser (client)                          Next.js server                     Microsoft
─────────────────                         ──────────────                     ──────────

[click "Validate ID token (server)"]
acquireTokenSilent({ scopes: ["User.Read"] })
  → returns result.idToken (a JWT)

fetch("/api/validate", {
  method: "POST",
  headers: { Authorization: `Bearer ${idToken}` }
}) ─────────────────────────────────►   POST /api/validate
                                            │
                                            ▼
                                         validateIdToken(token)
                                            │
                                            ▼  (fetched once, cached)
                                         createRemoteJWKSet ───────────► /discovery/v2.0/keys
                                                            ◄────────────  { keys: [...] }
                                            │
                                            ▼
                                         jwtVerify(token, JWKS, {
                                           issuer:   ".../{tenantId}/v2.0",
                                           audience: clientId,
                                         })
                                            - verify signature (RS256)
                                            - check iss matches our tenant
                                            - check aud matches our app
                                            - check exp / nbf
                                            │
                                            ▼
                                         200 { ok: true, header, claims }
                                         or 401 { ok: false, error }
                     ◄──────────────────────
```

The trust boundary: the server doesn't trust the client's word about who
the user is. It re-verifies the token's cryptographic signature against
Microsoft's published signing keys, then checks the token was issued by
*our* tenant for *our* application and is currently within its validity
window. Anything that fails these checks gets a `401`.

We validate the **ID token** (audience = our clientId, designed to be
validated by our app) rather than the **access token** (audience =
Microsoft Graph, designed to be validated by Graph). This is the
documented Microsoft Identity pattern.

## Project structure

```
.
├── app/
│   ├── layout.tsx              # Root layout (server component)
│   ├── page.tsx                # Login page; auto-redirects to /dashboard if signed in
│   ├── providers.tsx           # Client-side MsalProvider wrapper
│   ├── globals.css             # Tailwind base styles
│   ├── api/
│   │   └── validate/
│   │       └── route.ts        # POST /api/validate — server-side JWT validation
│   └── dashboard/
│       ├── layout.tsx          # Wraps children in <AuthGuard>
│       └── page.tsx            # Protected: token info, profile, groups, validate, sign out
├── components/
│   └── AuthGuard.tsx           # Redirects unauthenticated users to /
├── lib/
│   ├── msalConfig.ts           # MSAL Configuration + login scopes
│   └── validateIdToken.ts      # Server-side JWT validator (jose + Microsoft JWKS)
├── .env                        # Local env vars (gitignored)
├── next.config.ts              # Next.js config (devIndicators off)
├── package.json
└── tsconfig.json
```

## Setup

### 1. Register an application in Microsoft Entra ID

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → **New
   registration**.
2. Supported account types: *Accounts in this organizational directory only*
   (single tenant) is fine for an R&D project.
3. Redirect URI: select **Single-page application (SPA)**, value
   `http://localhost:3000`.
4. After creation, note the **Application (client) ID** and **Directory
   (tenant) ID**.

### 2. Configure API permissions

Under **API permissions** → **Add a permission** → **Microsoft Graph** →
**Delegated permissions**:

- `User.Read` (read user profile)
- `GroupMember.Read.All` (read group memberships)

Click **Grant admin consent for *YourTenant*** for both permissions. The
groups permission requires an admin to grant consent.

### 3. Clone and install

```bash
git clone https://github.com/<your-username>/iam-rd-lab.git
cd iam-rd-lab
npm install
```

### 4. Configure environment

Create a `.env` file (already gitignored) at the project root:

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=<your-application-client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<your-directory-tenant-id>
```

The `NEXT_PUBLIC_` prefix is required — MSAL runs in the browser, so the
values must be bundled into the client.

### 5. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000> in your browser. Click **Sign in with
Microsoft**, complete the Microsoft login (and consent on first use), and
you should land on the `/dashboard` page.

## Implementation status

### Scope statement coverage

| Item | Status |
|---|---|
| Next.js + React + MSAL + TypeScript scaffold | ✅ Done |
| Entra ID configuration (clientId, tenantId, authority) | ✅ Done |
| Sign-in UI (login page) | ✅ Done |
| OAuth 2.0 / OIDC authorization-code flow with PKCE | ✅ Verified end-to-end |
| Access token lifecycle (acquire, cache, display) | ✅ Done — `acquireTokenSilent` + UI display |
| Refresh token lifecycle (silent renewal) | ✅ Done — handled by MSAL; cache hits surfaced in UI |
| Microsoft Graph — user profile (`GET /me`) | ✅ Done |
| Microsoft Graph — group membership (`GET /me/memberOf`) | ✅ Done (requires admin consent in your tenant) |
| Delegated permissions model | ✅ Done |
| Protected route with client-side guard | ✅ Done — `/dashboard` + `<AuthGuard>` |
| Server-side JWT validation against Microsoft JWKS | ✅ Done — `POST /api/validate` + `lib/validateIdToken.ts` |

### Future improvements (out of original scope)

These are deliberate non-goals for the initial R&D scope, listed here as
candidates for follow-up work:

- **Content-Security-Policy headers** — configured in `next.config.ts`.
- **TypeScript types for Graph responses** — install
  `@microsoft/microsoft-graph-types` and type the response payloads.
- **Per-button loading states** and polished error UX (currently raw JSON).
- **Multi-account support** — the code currently uses `accounts[0]`.
- **Live token expiry countdown** in the UI.
- **Conditional Access claims-challenge handling** for Graph responses.
- **Audit logging** of sign-in / sign-out events.
- **Tests**.

## Security notes

- Tokens are cached in `sessionStorage`, scoped to the current tab. Closing
  the tab clears the cache and signs the user out. This is the more
  conservative choice; `localStorage` would persist tokens across tabs and
  browser restarts at a larger XSS blast radius.
- **Two layers of trust boundary:**
  - **Microsoft Graph** enforces the access token on every call (this is
    the boundary for Graph data).
  - **`POST /api/validate`** independently re-verifies the ID token's
    signature against Microsoft's JWKS and checks `iss` / `aud` / `exp`.
    This is the pattern any future protected API route in this app would
    re-use: take the `Authorization: Bearer` header, call
    `validateIdToken()`, branch on success/failure.
- The `AuthGuard` is a **client-side UX guard**, not a security boundary.
  It hides the dashboard UI from unauthenticated users but cannot stop
  anyone from fetching the route's HTML. The actual data is protected by
  the two boundaries above.
- `.env` is gitignored (`/.env*` in `.gitignore`), so client IDs and tenant
  IDs are not committed.

## Scripts

| Command | Effect |
|---|---|
| `npm run dev` | Start the Next.js dev server (Turbopack) on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |

## License

Personal project — no license assigned.
