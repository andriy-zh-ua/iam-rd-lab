import { NextResponse } from "next/server";
import { validateIdToken } from "@/lib/validateIdToken";

// POST /api/validate
// Expects: Authorization: Bearer <id_token>
// Returns: 200 { ok: true, header, claims }   on success
//          401 { ok: false, error }            on missing/invalid token
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json(
      { ok: false, error: "Missing or malformed Authorization header" },
      { status: 401 }
    );
  }

  const token = auth.slice("bearer ".length).trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Empty token" },
      { status: 401 }
    );
  }

  try {
    const { header, payload } = await validateIdToken(token);
    return NextResponse.json({
      ok: true,
      message: "Token verified server-side against Microsoft JWKS",
      header,
      claims: payload,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      },
      { status: 401 }
    );
  }
}
