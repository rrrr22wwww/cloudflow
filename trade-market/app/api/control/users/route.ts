import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowUser,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";

type QueryBody = {
  token?: string;
  action?: "query";
  name?: string;
  email?: string;
  id?: string;
};

type UpdateBody = {
  token?: string;
  action?: "update";
  id?: string;
  name?: string;
  email?: string;
  img?: string;
  role?: string;
  rating?: number;
  balance?: number;
};

type DeleteBody = {
  token?: string;
  action?: "delete";
  id?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QueryBody | UpdateBody | DeleteBody;

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    if (body.action === "update") {
      const payload = await cloudflowGraphql<{ setUser: CloudflowUser }>(
        CLOUD_GQL.setUser,
        {
          id: body.id?.trim() || undefined,
          name: body.name?.trim() || undefined,
          email: body.email?.trim() || undefined,
          img: body.img?.trim() || undefined,
          role: body.role?.trim() || undefined,
          rating: typeof body.rating === "number" ? Math.round(body.rating) : undefined,
          balance: typeof body.balance === "number" ? body.balance : undefined,
        },
        body.token,
      );

      return NextResponse.json(payload.data?.setUser ?? null);
    }

    if (body.action === "delete") {
      if (!body.id?.trim()) {
        return NextResponse.json({ message: "id is required" }, { status: 400 });
      }

      const payload = await cloudflowGraphql<{ deleteUser: boolean }>(
        CLOUD_GQL.deleteUser,
        { id: body.id.trim() },
        body.token,
      );

      return NextResponse.json({ ok: payload.data?.deleteUser ?? false });
    }

    const queryName = "name" in body && typeof body.name === "string" ? body.name.trim() : "";
    const queryEmail =
      "email" in body && typeof body.email === "string" ? body.email.trim() : "";
    const queryID = "id" in body && typeof body.id === "string" ? body.id.trim() : "";

    const payload = await cloudflowGraphql<{ getUsers: CloudflowUser[] }>(
      CLOUD_GQL.getUsers,
      {
        name: queryName || undefined,
        email: queryEmail || undefined,
        id: queryID || undefined,
      },
      body.token,
    );

    return NextResponse.json(payload.data?.getUsers ?? []);
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ message: error.message, payload: error.payload }, { status: error.status || 500 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
