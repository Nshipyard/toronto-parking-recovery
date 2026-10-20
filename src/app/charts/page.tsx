import { Banner, Nav, Footer } from "@/components/chrome";
import ChartsView, { type ChartsData } from "@/components/ChartsView";
import { getData } from "@/lib/recovery";

export const metadata = {
  title: "Charts: Toronto parking recovery times by ward",
  description:
    "Four charts from the project's own dataset: recovery days by ward for February 2025, citywide parking tickets per day through the February 2025 storm, recovery days by ward and storm for all nine storms, and the median recovery days for each storm.",
};

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function buildData(): ChartsData {
  const data = getData();
  const febEvent = "2025-02-12";

  const febWards = data.wards
    .filter((w) => w.event_id === febEvent)
    .map((w) => ({ ward: w.ward, name: w.ward_name, days: w.recovery_days, status: w.status }))
    .sort((a, b) => (b.days ?? 999) - (a.days ?? 999));

  const dailyFeb = data.citywide[febEvent].daily
    .filter((d) => d.date >= "2025-02-01" && d.date <= "2025-02-28")
    .map((d) => ({
      date: d.date,
      count: d.count,
      baseline: d.ratio ? Math.round(d.count / d.ratio) : null,
      phase: d.phase,
    }));

  const wardList = [...new Map(data.wards.map((w) => [w.ward, w.ward_name])).entries()]
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    .map(([ward, name]) => ({ ward, name }));

  const heat = wardList.map((wl) => ({
    ward: wl.ward,
    name: wl.name,
    cells: data.events.map((e) => {
      const row = data.wards.find((w) => w.event_id === e.id && w.ward === wl.ward);
      return row
        ? { days: row.recovery_days, status: row.status }
        : { days: null, status: "unscored_low_baseline" };
    }),
  }));

  const storms = data.events.map((e) => {
    const rows = data.wards.filter((w) => w.event_id === e.id);
    const recovered = rows.filter((w) => w.recovery_days !== null).map((w) => w.recovery_days as number);
    return {
      id: e.id,
      start: e.start,
      end: e.end,
      snowCm: e.snow_total_cm,
      median: recovered.length ? median(recovered) : null,
      recoveredCount: recovered.length,
      totalWards: rows.length,
      dataEndCount: rows.filter((w) => w.status === "not_recovered_before_data_end").length,
    };
  });

  return { febWards, dailyFeb, wardList, heat, storms };
}

export default function ChartsPage() {
  const chartsData = buildData();
  return (
    <>
      <Banner />
      <Nav />
      <main className="flex-1">
        <ChartsView data={chartsData} />
      </main>
      <Footer />
    </>
  );
}
