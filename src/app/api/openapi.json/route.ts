import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Toronto Parking Recovery API",
    version: "1.0.0",
    description:
      "Days for parking enforcement to return to 90% of normal after major Toronto snowstorms, per ward and per 158-model neighbourhood, 2023-2025. Storms are defined from Environment Canada daily snowfall (Toronto Intl A, 6158731). Ticket counts are an inference about usable, enforced parking, not a direct measure of cleared streets. MIT licensed.",
  },
  servers: [{ url: "https://parking-recovery.canada.nshipyard.com/api/v1" }],
  paths: {
    "/recovery/summary": {
      get: {
        summary: "Dataset summary: events, February 2025 headline numbers, method parameters",
        responses: { "200": { description: "Summary object" } },
      },
    },
    "/recovery/events": {
      get: {
        summary: "The major snow events (snow day >= 5 cm, grouped within 3 days, window total >= 10 cm)",
        responses: { "200": { description: "Event list" } },
      },
    },
    "/recovery/by_ward": {
      get: {
        summary: "Recovery result per ward for one event",
        parameters: [
          { name: "event", in: "query", required: true, schema: { type: "string" }, example: "2025-02-12" },
          { name: "ward", in: "query", required: false, schema: { type: "string" }, example: "11" },
        ],
        responses: { "200": { description: "Ward rows or single ward" }, "400": { description: "Missing event" }, "404": { description: "Unknown event or ward" } },
      },
    },
    "/recovery/by_neighbourhood": {
      get: {
        summary: "Recovery result per 158-model neighbourhood for one event",
        parameters: [
          { name: "event", in: "query", required: true, schema: { type: "string" }, example: "2025-02-12" },
          { name: "hood", in: "query", required: false, schema: { type: "string" }, example: "095" },
        ],
        responses: { "200": { description: "Neighbourhood rows or single neighbourhood" }, "400": { description: "Missing event" }, "404": { description: "Unknown event or code" } },
      },
    },
    "/recovery/daily": {
      get: {
        summary: "Citywide daily geocoded ticket counts as a ratio to the same-weekday baseline, 14 days before the event to 30 days after it ends",
        parameters: [{ name: "event", in: "query", required: true, schema: { type: "string" }, example: "2025-02-12" }],
        responses: { "200": { description: "Daily series" }, "404": { description: "Unknown event" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
