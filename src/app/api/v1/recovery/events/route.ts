import { NextResponse } from "next/server";
import { getData } from "@/lib/recovery";

export async function GET() {
  const events = getData().events;
  return NextResponse.json({ count: events.length, events });
}
