import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowProduct,
  type CloudflowServerAccess,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

type ProductAccessInput = {
  ipAddress?: string;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  port?: number;
  connectionNotes?: string;
};

type QueryBody = {
  token?: string;
  action?: "query";
  id?: string;
  name?: string;
  sellerID?: string;
};

type CreateBody = {
  token?: string;
  action?: "create";
  sellerID?: string;
  categoryID?: number;
  name?: string;
  description?: string;
  price?: number;
  rating?: number;
  tags?: string[];
  access?: ProductAccessInput;
  previewImage?: string;
};

type UpdateBody = {
  token?: string;
  action?: "update";
  id?: string;
  categoryID?: number;
  name?: string;
  description?: string;
  price?: number;
  rating?: number;
  status?: string;
  tags?: string[];
  access?: ProductAccessInput;
  previewImage?: string;
};

type DeleteBody = {
  token?: string;
  action?: "delete";
  id?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QueryBody | CreateBody | UpdateBody | DeleteBody;

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    if (body.action === "create") {
      if (
        !body.sellerID?.trim() ||
        !body.name?.trim() ||
        !body.description?.trim() ||
        typeof body.price !== "number"
      ) {
        return NextResponse.json({ message: "Missing required product fields" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ setProduct: CloudflowProduct }>(
        CLOUD_GQL.setProduct,
        {
          sellerID: body.sellerID.trim(),
          categoryID: typeof body.categoryID === "number" ? body.categoryID : undefined,
          name: body.name.trim(),
          description: body.description.trim(),
          price: body.price,
          rating: typeof body.rating === "number" ? Math.round(body.rating) : undefined,
          tags: body.tags ?? [],
        },
        body.token,
      );

      const createdProduct = payload.data?.setProduct ?? null;
      if (!createdProduct) {
        return NextResponse.json(null);
      }

      if (body.access?.ipAddress?.trim() && body.access?.sshUsername?.trim()) {
        try {
          await cloudflowGraphql<{ setProductAccess: CloudflowServerAccess }>(
            CLOUD_GQL.setProductAccess,
            {
              productID: createdProduct.id,
              ipAddress: body.access.ipAddress.trim(),
              sshUsername: body.access.sshUsername.trim(),
              sshPassword: body.access.sshPassword?.trim() || undefined,
              sshPrivateKey: body.access.sshPrivateKey?.trim() || undefined,
              port:
                typeof body.access.port === "number" && Number.isFinite(body.access.port)
                  ? Math.round(body.access.port)
                  : undefined,
              connectionNotes: body.access.connectionNotes?.trim() || undefined,
            },
            body.token,
          );
        } catch (accessError) {
          await cloudflowGraphql<{ deleteProduct: boolean }>(
            CLOUD_GQL.deleteProduct,
            { id: createdProduct.id },
            body.token,
          ).catch(() => null);

          if (accessError instanceof CloudflowApiError) {
            throw accessError;
          }
          throw accessError;
        }
      }

      if (body.previewImage?.trim()) {
        await cloudflowGraphql<{ setProductPreviewImage: CloudflowProduct }>(
          CLOUD_GQL.setProductPreviewImage,
          {
            productID: createdProduct.id,
            fileName: body.previewImage.trim(),
          },
          body.token,
        );
      }

      const refreshed = await cloudflowGraphql<{ getProducts: CloudflowProduct[] }>(
        CLOUD_GQL.getProducts,
        { id: createdProduct.id },
        body.token,
      );

      return NextResponse.json(refreshed.data?.getProducts?.[0] ?? createdProduct);
    }

    if (body.action === "update") {
      if (!body.id?.trim()) {
        return NextResponse.json({ message: "id is required" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ updateProduct: CloudflowProduct }>(
        CLOUD_GQL.updateProduct,
        {
          id: body.id.trim(),
          categoryID: typeof body.categoryID === "number" ? body.categoryID : undefined,
          name: body.name?.trim() || undefined,
          description: body.description?.trim() || undefined,
          price: typeof body.price === "number" ? body.price : undefined,
          rating: typeof body.rating === "number" ? Math.round(body.rating) : undefined,
          status: body.status?.trim() || undefined,
          tags: body.tags,
        },
        body.token,
      );

      const updatedProduct = payload.data?.updateProduct ?? null;

      if (updatedProduct && body.access?.ipAddress?.trim() && body.access?.sshUsername?.trim()) {
        await cloudflowGraphql(
          CLOUD_GQL.setProductAccess,
          {
            productID: updatedProduct.id,
            ipAddress: body.access.ipAddress.trim(),
            sshUsername: body.access.sshUsername.trim(),
            sshPassword: body.access.sshPassword?.trim() || undefined,
            sshPrivateKey: body.access.sshPrivateKey?.trim() || undefined,
            port:
              typeof body.access.port === "number" && Number.isFinite(body.access.port)
                ? Math.round(body.access.port)
                : undefined,
            connectionNotes: body.access.connectionNotes?.trim() || undefined,
          },
          body.token,
        );
      }

      if (updatedProduct && body.previewImage?.trim()) {
        await cloudflowGraphql(
          CLOUD_GQL.setProductPreviewImage,
          {
            productID: updatedProduct.id,
            fileName: body.previewImage.trim(),
          },
          body.token,
        );
      }

      const refreshed = updatedProduct
        ? await cloudflowGraphql<{ getProducts: CloudflowProduct[] }>(
            CLOUD_GQL.getProducts,
            { id: updatedProduct.id },
            body.token,
          )
        : null;

      return NextResponse.json(refreshed?.data?.getProducts?.[0] ?? updatedProduct);
    }

    if (body.action === "delete") {
      if (!body.id?.trim()) {
        return NextResponse.json({ message: "id is required" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ deleteProduct: boolean }>(
        CLOUD_GQL.deleteProduct,
        { id: body.id.trim() },
        body.token,
      );

      return NextResponse.json({ ok: payload.data?.deleteProduct ?? false });
    }

    const queryId = "id" in body && typeof body.id === "string" ? body.id.trim() : "";
    const queryName = "name" in body && typeof body.name === "string" ? body.name.trim() : "";
    const querySellerID =
      "sellerID" in body && typeof body.sellerID === "string" ? body.sellerID.trim() : "";

    const payload = await cloudflowGraphql<{ getProducts: CloudflowProduct[] }>(
      CLOUD_GQL.getProducts,
      {
        id: queryId || undefined,
        name: queryName || undefined,
        sellerID: querySellerID || undefined,
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
