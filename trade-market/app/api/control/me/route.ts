import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowUser,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    const payload = await cloudflowGraphql<{ me: CloudflowUser | null }>(CLOUD_GQL.me, {}, body.token);
    return NextResponse.json(payload.data?.me ?? null);
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ message: error.message, payload: error.payload }, { status: error.status || 500 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
