import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowAuthPayload,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      img?: string;
      password?: string;
    };

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { message: "name, email, password are required" },
        { status: 400 },
      );
    }

    const avatar =
      body.img?.trim() ||
      `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(body.name)}`;

    const payload = await cloudflowGraphql<{ register: CloudflowAuthPayload }>(
      CLOUD_GQL.register,
      {
        name: body.name,
        email: body.email,
        img: avatar,
        password: body.password,
      },
    );

    return NextResponse.json(payload.data?.register ?? null);
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
