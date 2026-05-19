import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// Server-side validation of Microsoft Entra ID v2.0 ID tokens.
//
// We re-use NEXT_PUBLIC_* values here because they happen to also be available
// to server code in Next.js. The trust boundary is: we validate the token's
// signature against Microsoft's JWKS, then check it was issued by *our* tenant
// for *our* application.

const TENANT_ID = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
const CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;

if (!TENANT_ID || !CLIENT_ID) {
  throw new Error(
    "Missing NEXT_PUBLIC_AZURE_TENANT_ID or NEXT_PUBLIC_AZURE_CLIENT_ID env var"
  );
}

const JWKS_URI = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
const AUDIENCE = CLIENT_ID;

// createRemoteJWKSet handles fetching, caching, and rotation of signing keys.
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

export type ValidatedToken = {
  header: { alg?: string; kid?: string; typ?: string };
  payload: JWTPayload;
};

export async function validateIdToken(token: string): Promise<ValidatedToken> {
  const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return {
    header: {
      alg: protectedHeader.alg,
      kid: protectedHeader.kid,
      typ: protectedHeader.typ as string | undefined,
    },
    payload,
  };
}
