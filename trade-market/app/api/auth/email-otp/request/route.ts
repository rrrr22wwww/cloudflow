import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowEmailLoginCodePayload,
  CloudflowApiError,
  cloudflowGraphql,
  isCloudflowEmailLoginCodePayload,
} from "@/lib/cloudflow-api";

type RequestBody = {
  email?: string;
  identifier?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const identifier = body.identifier?.trim() || body.email?.trim();

    if (!identifier || !body.password) {
      return NextResponse.json(
        { message: "identifier/email and password are required" },
        { status: 400 },
      );
    }

    const payload = await cloudflowGraphql<{
      requestEmailLoginCode: CloudflowEmailLoginCodePayload;
    }>(CLOUD_GQL.requestEmailLoginCode, {
      email: identifier,
      password: body.password,
    });

    const challenge = payload.data?.requestEmailLoginCode;
    if (!isCloudflowEmailLoginCodePayload(challenge)) {
      return NextResponse.json(
        { message: "Backend did not return a valid 2FA challenge" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      challengeId: challenge.challenge_id,
      email: challenge.email,
      expiresIn: challenge.expires_in,
      delivery: "email",
    });
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json(
        { message: error.message, payload: error.payload },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
