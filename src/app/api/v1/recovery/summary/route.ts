import { NextResponse } from "next/server";
import { getData } from "@/lib/recovery";

/** Dataset summary: event list, Feb 2025 headline numbers, method parameters. */
export async function GET() {
  const d = getData();
  const febId = "2025-02-12";
  const feb = d.events.find((e) => e.id === febId);
  const febWards = d.wards.filter((w) => w.event_id === febId && w.scored && w.recovery_days !== null);
  const slowest = febWards.reduce<number | null>(
    (m, w) => (w.recovery_days !== null && (m === null || w.recovery_days > m) ? w.recovery_days : m),
    null
  );
  return NextResponse.json({
    events_count: d.events.length,
    events: d.events,
    feb_event: {
      id: febId,
      snow_total_cm: feb?.snow_total_cm ?? null,
      peak_snow_on_ground_cm: feb?.peak_snow_on_ground_cm ?? null,
      wards_scored: d.wards.filter((w) => w.event_id === febId && w.scored).length,
      slowest_ward_days: slowest,
    },
    method: d.method,
  });
}
