import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exportLab } from "@/lib/lab";

export const runtime = "nodejs";

/** The whole lab as one JSON download: schema plus every collection's records. */
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ status: "ERROR", errors: ["Not signed in"] }, { status: 401 });
  const body = JSON.stringify(await exportLab(), null, 2) + "\n";
  return new NextResponse(body, {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="newton-lab.json"' },
  });
}
