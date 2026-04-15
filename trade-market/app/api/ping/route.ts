import { NextResponse } from "next/server";
import { CloudflowApiError, cloudflowPing } from "@/lib/cloudflow-api";

export async function GET() {
  try {
    const payload = await cloudflowPing();
    return NextResponse.json({ ok: true, payload });
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ ok: false, message: error.message, payload: error.payload }, { status: 503 });
    }

    return NextResponse.json({ ok: false, message: "Ping failed" }, { status: 503 });
  }
}
