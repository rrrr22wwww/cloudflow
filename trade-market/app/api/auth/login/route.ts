import { NextResponse } from "next/server";
import { CLOUD_GQL, type CloudflowAuthPayload, CloudflowApiError, cloudflowGraphql } from "@/lib/cloudflow-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      identifier?: string;
      password?: string;
      totp?: string;
    };

    const identifier = body.identifier?.trim() || body.email?.trim();
    if (!identifier || !body.password) {
      return NextResponse.json({ message: "identifier/email and password are required" }, { status: 400 });
    }

    if (body.totp && !/^\d{6}$/.test(body.totp.trim())) {
      return NextResponse.json({ message: "totp must be a 6-digit code" }, { status: 400 });
    }

    const payload = await cloudflowGraphql<{ login: CloudflowAuthPayload }>(CLOUD_GQL.login, {
      email: identifier,
      password: body.password,
    });

    return NextResponse.json(payload.data?.login ?? null);
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ message: error.message, payload: error.payload }, { status: error.status || 500 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
