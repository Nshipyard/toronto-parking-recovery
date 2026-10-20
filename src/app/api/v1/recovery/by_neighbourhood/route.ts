import { NextResponse } from "next/server";
import { getData } from "@/lib/recovery";

/** GET /api/v1/recovery/by_neighbourhood?event=2025-02-12[&hood=095] */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const event = searchParams.get("event");
  const hood = searchParams.get("hood");
  const d = getData();
  if (!event) return NextResponse.json({ error: "event query parameter is required (see /api/v1/recovery/events)" }, { status: 400 });
  if (!d.events.some((e) => e.id === event)) return NextResponse.json({ error: "unknown event" }, { status: 404 });
  const rows = d.neighbourhoods.filter((h) => h.event_id === event);
  if (hood) {
    const h = rows.find((x) => x.hood === hood);
    if (!h) return NextResponse.json({ error: "unknown neighbourhood code for this event" }, { status: 404 });
    return NextResponse.json(h);
  }
  return NextResponse.json({ count: rows.length, event_id: event, neighbourhoods: rows });
}
