import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowCategory,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

type QueryBody = {
  token?: string;
  action?: "query";
};

type CreateBody = {
  token?: string;
  action?: "create";
  name?: string;
  parentID?: number | null;
};

type UpdateBody = {
  token?: string;
  action?: "update";
  id?: number;
  name?: string;
  parentID?: number | null;
};

type DeleteBody = {
  token?: string;
  action?: "delete";
  id?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QueryBody | CreateBody | UpdateBody | DeleteBody;

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    if (body.action === "create") {
      if (!body.name?.trim()) {
        return NextResponse.json({ message: "name is required" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ setCategory: CloudflowCategory }>(
        CLOUD_GQL.setCategory,
        {
          name: body.name.trim(),
          parentID: typeof body.parentID === "number" ? body.parentID : undefined,
        },
        body.token,
      );

      return NextResponse.json(payload.data?.setCategory ?? null);
    }

    if (body.action === "update") {
      if (typeof body.id !== "number") {
        return NextResponse.json({ message: "id is required" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ updateCategory: CloudflowCategory }>(
        CLOUD_GQL.updateCategory,
        {
          id: body.id,
          name: body.name?.trim() || undefined,
          parentID: typeof body.parentID === "number" ? body.parentID : null,
        },
        body.token,
      );

      return NextResponse.json(payload.data?.updateCategory ?? null);
    }

    if (body.action === "delete") {
      if (typeof body.id !== "number") {
        return NextResponse.json({ message: "id is required" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ deleteCategory: boolean }>(
        CLOUD_GQL.deleteCategory,
        { id: body.id },
        body.token,
      );

      return NextResponse.json({ ok: payload.data?.deleteCategory ?? false });
    }

    const payload = await cloudflowGraphql<{ getCategories: CloudflowCategory[] }>(
      CLOUD_GQL.getCategories,
      {},
      body.token,
    );

    return NextResponse.json(payload.data?.getCategories ?? []);
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ message: error.message, payload: error.payload }, { status: error.status || 500 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
