import { NextResponse } from "next/server";
import { CLOUD_GQL, type CloudflowProduct, CloudflowApiError, cloudflowGraphql } from "@/lib/cloudflow-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      id?: string;
      name?: string;
      sellerID?: string;
    };

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    const payload = await cloudflowGraphql<{ getProducts: CloudflowProduct[] }>(
      CLOUD_GQL.getProducts,
      {
        id: body.id?.trim() ? body.id.trim() : undefined,
        name: body.name?.trim() ? body.name.trim() : undefined,
        sellerID: body.sellerID?.trim() ? body.sellerID.trim() : undefined,
      },
      body.token,
    );

    return NextResponse.json(payload.data?.getProducts ?? []);
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ message: error.message, payload: error.payload }, { status: error.status || 500 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
