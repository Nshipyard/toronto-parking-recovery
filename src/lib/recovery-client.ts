/** Client-safe helpers (no node imports). */

export function statusLabel(status: string, lang: "en" | "fr"): string {
  const map: Record<string, [string, string]> = {
    recovered: ["Recovered", "Rétabli"],
    not_recovered_30d: ["Not back within 30 days", "Non rétabli sous 30 jours"],
    not_recovered_before_data_end: ["Not back before the data ends", "Non rétabli avant la fin des données"],
    unscored_low_baseline: ["Too few tickets to score", "Trop peu de contraventions pour être noté"],
  };
  const m = map[status];
  return m ? (lang === "fr" ? m[1] : m[0]) : status;
}

export function shortDate(isoDate: string, lang: "en" | "fr"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fr = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  const mm = lang === "fr" ? fr[m - 1] : en[m - 1];
  return lang === "fr" ? `${d} ${mm} ${y}` : `${mm} ${d}, ${y}`;
}
