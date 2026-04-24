import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowProduct,
  type CloudflowPurchasePayload,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

type QueryBody = {
  token?: string;
  action?: "query";
  buyerID?: string;
};

type CreateBody = {
  token?: string;
  action?: "create";
  productID?: string;
  rating?: number;
  comment?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QueryBody | CreateBody;

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    if (body.action === "create") {
      if (!body.productID?.trim()) {
        return NextResponse.json({ message: "productID is required" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ purchaseProduct: CloudflowPurchasePayload }>(
        CLOUD_GQL.purchaseProduct,
        {
          productID: body.productID.trim(),
          rating:
            typeof body.rating === "number" && Number.isFinite(body.rating)
              ? Math.max(1, Math.min(5, Math.round(body.rating)))
              : undefined,
          comment: body.comment?.trim() || undefined,
        },
        body.token,
      );

      return NextResponse.json(payload.data?.purchaseProduct ?? null);
    }

    const payload = await cloudflowGraphql<{ getPurchasedProducts: CloudflowProduct[] }>(
      CLOUD_GQL.getPurchasedProducts,
      {
        buyerID: "buyerID" in body && typeof body.buyerID === "string" ? body.buyerID.trim() || undefined : undefined,
      },
      body.token,
    );

    return NextResponse.json(payload.data?.getPurchasedProducts ?? []);
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
