import { NextResponse } from "next/server";
import { CLOUD_GQL, type CloudflowProduct, CloudflowApiError, cloudflowGraphql } from "@/lib/cloudflow-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      sellerID?: string;
      categoryID?: number;
      name?: string;
      description?: string;
      price?: number;
      rating?: number;
      tags?: string[];
    };

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    if (
      !body.sellerID ||
      !body.name ||
      !body.description ||
      typeof body.categoryID !== "number" ||
      typeof body.price !== "number" ||
      typeof body.rating !== "number"
    ) {
      return NextResponse.json({ message: "Missing required product fields" }, { status: 400 });
    }

    const payload = await cloudflowGraphql<{ setProduct: CloudflowProduct }>(
      CLOUD_GQL.setProduct,
      {
        sellerID: body.sellerID,
        categoryID: body.categoryID,
        name: body.name,
        description: body.description,
        price: body.price,
        rating: body.rating,
        tags: body.tags ?? [],
      },
      body.token,
    );

    return NextResponse.json(payload.data?.setProduct ?? null);
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ message: error.message, payload: error.payload }, { status: error.status || 500 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
