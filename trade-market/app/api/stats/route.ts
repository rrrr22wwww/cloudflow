import { NextResponse } from "next/server";
import { cloudflowPing } from "@/lib/cloudflow-api";

export async function GET() {
  let apiOnline = false;

  try {
    await cloudflowPing();
    apiOnline = true;
  } catch {
    apiOnline = false;
  }

  const now = Date.now();
  const minuteWave = Math.sin(now / 60000);

  const items = [
    {
      symbol: apiOnline ? "API:ONLINE" : "API:OFFLINE",
      price: apiOnline ? 200 : 503,
      change24h: apiOnline ? 1.2 : -2.8,
    },
    {
      symbol: "DEDICATED-RU-MSK",
      price: Number((6900 + minuteWave * 40).toFixed(2)),
      change24h: Number((1.1 + minuteWave * 0.5).toFixed(2)),
    },
    {
      symbol: "VPS-NVME-EU",
      price: Number((1490 - minuteWave * 18).toFixed(2)),
      change24h: Number((-0.4 + minuteWave * 0.35).toFixed(2)),
    },
    {
      symbol: "GPU-RTX",
      price: Number((14900 + minuteWave * 65).toFixed(2)),
      change24h: Number((2.2 + minuteWave * 0.6).toFixed(2)),
    },
    {
      symbol: "K8S-MANAGED",
      price: Number((9900 + Math.cos(now / 90000) * 52).toFixed(2)),
      change24h: Number((0.9 + Math.sin(now / 70000) * 0.42).toFixed(2)),
    },
  ];

  return NextResponse.json(items);
}
