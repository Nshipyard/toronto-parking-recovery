import { NextResponse } from "next/server";
import { getData } from "@/lib/recovery";

/** GET /api/v1/recovery/daily?event=2025-02-12 : citywide daily counts, ratio to weekday baseline. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const event = searchParams.get("event");
  const d = getData();
  if (!event) return NextResponse.json({ error: "event query parameter is required (see /api/v1/recovery/events)" }, { status: 400 });
  const block = d.citywide[event];
  if (!block) return NextResponse.json({ error: "unknown event" }, { status: 404 });
  return NextResponse.json({ event_id: event, baseline_daily_mean: block.baseline_daily_mean, daily: block.daily });
}
