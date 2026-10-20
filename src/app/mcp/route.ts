import { NextResponse } from "next/server";
import { getData } from "@/lib/recovery";

// Minimal MCP server over streamable HTTP (JSON-RPC 2.0 via POST).
// Supports: initialize, tools/list, tools/call. Stateless.

const SERVER = { name: "toronto-parking-recovery", version: "1.0.0" };

const TOOLS = [
  {
    name: "recovery_events",
    description:
      "List the major Toronto snowstorms measured in this dataset (2023-2025), with window dates and snowfall totals from Environment Canada (Toronto Intl A).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "recovery_ward",
    description:
      "Parking enforcement recovery for one Toronto ward in one storm: baseline tickets per day, recovery days to reach 90% of normal (two consecutive days), scored flag and status. Recovery is an inference from ticket counts, not a direct measure of cleared streets. Pass event as its id, e.g. '2025-02-12', and ward as its number, e.g. '11'.",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event id, e.g. '2025-02-12'" },
        ward: { type: "string", description: "Ward number, e.g. '11'" },
      },
      required: ["event", "ward"],
    },
  },
  {
    name: "recovery_neighbourhood",
    description:
      "Parking enforcement recovery for one 158-model Toronto neighbourhood in one storm, same fields as recovery_ward. Pass event as its id and hood as its 3-digit code, e.g. '095'.",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event id, e.g. '2025-02-12'" },
        hood: { type: "string", description: "158-model neighbourhood code, e.g. '095'" },
      },
      required: ["event", "hood"],
    },
  },
  {
    name: "recovery_ranking",
    description:
      "Slowest and fastest recovering wards for one storm (recovery days to reach 90% of normal), plus the wards that never reached 90% within 30 days. Pass event as its id, e.g. '2025-02-12'.",
    inputSchema: {
      type: "object",
      properties: { event: { type: "string", description: "Event id, e.g. '2025-02-12'" } },
      required: ["event"],
    },
  },
];

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function err(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function textResult(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function handle(msg: any) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg?.id ?? null, -32600, "Invalid Request");
  }
  const id = msg.id ?? null;
  switch (msg.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
    case "notifications/initialized":
      return null;
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const { name, arguments: args } = msg.params ?? {};
      try {
        const d = getData();
        if (name === "recovery_events") {
          return ok(id, textResult({ count: d.events.length, events: d.events }));
        }
        if (name === "recovery_ward") {
          const w = d.wards.find((x) => x.event_id === String(args.event) && x.ward === String(args.ward).padStart(2, "0"));
          if (!w) return err(id, -32001, `Unknown event/ward combination`);
          return ok(id, textResult(w));
        }
        if (name === "recovery_neighbourhood") {
          const h = d.neighbourhoods.find((x) => x.event_id === String(args.event) && x.hood === String(args.hood));
          if (!h) return err(id, -32001, `Unknown event/neighbourhood combination`);
          return ok(id, textResult(h));
        }
        if (name === "recovery_ranking") {
          const rows = d.wards.filter((x) => x.event_id === String(args.event));
          if (!rows.length) return err(id, -32001, `Unknown event ${args.event}`);
          const scored = rows.filter((x) => x.scored && x.recovery_days !== null).sort((a, b) => (a.recovery_days ?? 0) - (b.recovery_days ?? 0));
          return ok(id, textResult({
            event: String(args.event),
            fastest: scored.slice(0, 5),
            slowest: scored.slice(-5).reverse(),
            not_recovered_within_30_days: rows.filter((x) => x.scored && x.recovery_days === null),
            unscored: rows.filter((x) => !x.scored).map((x) => ({ ward: x.ward, ward_name: x.ward_name, baseline_daily_mean: x.baseline_daily_mean })),
          }));
        }
        return err(id, -32602, `Unknown tool ${name}`);
      } catch (e) {
        return err(id, -32000, `Tool error: ${(e as Error).message}`);
      }
    }
    default:
      return err(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 });
  }
  if (Array.isArray(body)) {
    const out = body.map(handle).filter((r) => r !== null);
    return NextResponse.json(out);
  }
  const out = handle(body);
  if (out === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(out);
}

export async function GET() {
  return NextResponse.json(
    { error: "This MCP server accepts JSON-RPC 2.0 via POST only." },
    { status: 405 }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}
