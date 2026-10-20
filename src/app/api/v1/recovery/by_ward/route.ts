import { NextResponse } from "next/server";
import { getData } from "@/lib/recovery";

/** GET /api/v1/recovery/by_ward?event=2025-02-12[&ward=11] */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const event = searchParams.get("event");
  const ward = searchParams.get("ward");
  const d = getData();
  if (!event) return NextResponse.json({ error: "event query parameter is required (see /api/v1/recovery/events)" }, { status: 400 });
  if (!d.events.some((e) => e.id === event)) return NextResponse.json({ error: "unknown event" }, { status: 404 });
  const rows = d.wards.filter((w) => w.event_id === event);
  if (ward) {
    const w = rows.find((x) => x.ward === ward.padStart(2, "0"));
    if (!w) return NextResponse.json({ error: "unknown ward for this event" }, { status: 404 });
    return NextResponse.json(w);
  }
  return NextResponse.json({ count: rows.length, event_id: event, wards: rows });
}
