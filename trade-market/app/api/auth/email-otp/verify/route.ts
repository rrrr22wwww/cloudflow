import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowAuthPayload,
  CloudflowApiError,
  cloudflowGraphql,
  isCloudflowAuthPayload,
} from "@/lib/cloudflow-api";

type RequestBody = {
  challengeId?: string;
  code?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const challengeId = body.challengeId?.trim();
    const code = body.code?.trim();

    if (!challengeId || !code) {
      return NextResponse.json({ message: "challengeId and code are required" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ message: "2FA code must be 6 digits" }, { status: 400 });
    }

    const payload = await cloudflowGraphql<{
      verifyEmailLoginCode: CloudflowAuthPayload;
    }>(CLOUD_GQL.verifyEmailLoginCode, {
      challengeId,
      code,
    });

    const session = payload.data?.verifyEmailLoginCode;
    if (!isCloudflowAuthPayload(session)) {
      return NextResponse.json(
        { message: "Backend did not return a valid session" },
        { status: 502 },
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json(
        { message: error.message, payload: error.payload },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
