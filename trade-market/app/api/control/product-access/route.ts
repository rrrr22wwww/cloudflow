import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowServerAccess,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

type QueryBody = {
  token?: string;
  action?: "query";
  productID?: string;
};

type UpdateBody = {
  token?: string;
  action?: "set";
  productID?: string;
  ipAddress?: string;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  port?: number;
  connectionNotes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QueryBody | UpdateBody;

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    if (!body.productID?.trim()) {
      return NextResponse.json({ message: "productID is required" }, { status: 400 });
    }

    if (body.action === "set") {
      if (!body.ipAddress?.trim() || !body.sshUsername?.trim()) {
        return NextResponse.json(
          { message: "ipAddress and sshUsername are required" },
          { status: 400 },
        );
      }

      const payload = await cloudflowGraphql<{ setProductAccess: CloudflowServerAccess }>(
        CLOUD_GQL.setProductAccess,
        {
          productID: body.productID.trim(),
          ipAddress: body.ipAddress.trim(),
          sshUsername: body.sshUsername.trim(),
          sshPassword: body.sshPassword?.trim() || undefined,
          sshPrivateKey: body.sshPrivateKey?.trim() || undefined,
          port: typeof body.port === "number" ? body.port : undefined,
          connectionNotes: body.connectionNotes?.trim() || undefined,
        },
        body.token,
      );

      return NextResponse.json(payload.data?.setProductAccess ?? null);
    }

    const payload = await cloudflowGraphql<{ getProductAccess: CloudflowServerAccess }>(
      CLOUD_GQL.getProductAccess,
      { productID: body.productID.trim() },
      body.token,
    );

    return NextResponse.json(payload.data?.getProductAccess ?? null);
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
