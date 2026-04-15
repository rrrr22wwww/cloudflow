import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Deprecated in trade-market. Use POST /api/servers/query with token to fetch real products from Cloudflow backend.",
    },
    { status: 410 },
  );
}
