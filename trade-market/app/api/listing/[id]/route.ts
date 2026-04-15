import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Deprecated in trade-market. Use POST /api/servers/query with token and id filter to fetch real product details.",
    },
    { status: 410 },
  );
}
