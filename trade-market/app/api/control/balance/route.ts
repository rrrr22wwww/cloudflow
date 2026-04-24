import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowUser,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; amount?: number };

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
      return NextResponse.json({ message: "amount must be greater than zero" }, { status: 400 });
    }

    const payload = await cloudflowGraphql<{ topUpBalance: CloudflowUser }>(
      CLOUD_GQL.topUpBalance,
      { amount: body.amount },
      body.token,
    );

    return NextResponse.json(payload.data?.topUpBalance ?? null);
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
