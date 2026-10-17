import { NextResponse } from "next/server";
import { runLifecycle } from "@engine";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/** POST an organisation profile, get Newton's lifecycle selections back. See engine/README.md for the fields. */
export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ status: "ERROR", errors: ["Not signed in"] }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "ERROR", errors: ["Body must be JSON"] }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ status: "ERROR", errors: ["Body must be a JSON object"] }, { status: 400 });
  }
  const result = runLifecycle(body as Record<string, unknown>);
  return NextResponse.json(result, { status: result.status === "OK" ? 200 : 422 });
}
