import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

export interface RecoveryEvent {
  id: string;
  start: string;
  end: string;
  snow_days: string[];
  snow_total_cm: number;
  peak_snow_on_ground_cm: number;
  station: string;
  source: string;
}

export interface WardRow {
  event_id: string;
  event_start: string;
  event_end: string;
  ward: string;
  ward_name: string;
  baseline_daily_mean: number;
  baseline_days: number;
  scored: boolean;
  status: string;
  recovery_days: number | null;
  recovery_date: string | null;
  dip_ratio: number | null;
  dip_date: string | null;
}

export interface HoodRow {
  event_id: string;
  event_start: string;
  event_end: string;
  hood: string;
  hood_name: string;
  baseline_daily_mean: number;
  baseline_days: number;
  scored: boolean;
  status: string;
  recovery_days: number | null;
  recovery_date: string | null;
  dip_ratio: number | null;
  dip_date: string | null;
}

export interface CityDay {
  date: string;
  count: number;
  ratio: number | null;
  phase: "pre" | "event" | "post";
}

export interface RecoveryData {
  events: RecoveryEvent[];
  citywide: Record<string, { baseline_daily_mean: number; daily: CityDay[] }>;
  wards: WardRow[];
  neighbourhoods: HoodRow[];
  method: {
    snow_source: string;
    tickets_source: string;
    snow_day_cm: number;
    group_gap_days: number;
    major_total_cm: number;
    baseline_days: number;
    threshold: number;
    hold_days: number;
    search_days: number;
    ward_min_baseline_per_day: number;
    hood_min_baseline_per_day: number;
  };
}

let cache: RecoveryData | null = null;

export function getData(): RecoveryData {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(path.join(DATA, "recovery.json"), "utf-8")) as RecoveryData;
  }
  return cache;
}

export function fmt(n: number): string {
  return n.toLocaleString("en-CA");
}
