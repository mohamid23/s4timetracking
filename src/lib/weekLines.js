import { addDays } from "./helpers";

/* Rows for the weekly time grid: every client / project / service line this person has
   logged hours against in the weeks leading up to the one on screen, so the same rows
   are waiting each week without re-adding them. Hours themselves never carry over.

   - `lookbackWeeks`: how far back to remember a line (about a quarter by default), so a
     client someone stopped working on eventually drops off by itself.
   - `hidden`: line keys this person removed from their grid on purpose.
   - `extra`: lines added this visit that have no hours yet. */

export const LOOKBACK_WEEKS = 12;
export const lineKey = (l) => `${l.client}||${l.project || ""}||${l.svc}`;

export function buildWeekLines({ entries, me, weekStart, days, extra = [], hidden = [], lookbackWeeks = LOOKBACK_WEEKS }) {
  const all = Object.values(entries).flat().filter((e) => e.emp === me);
  const from = addDays(weekStart, -7 * lookbackWeeks);
  const hiddenSet = new Set(hidden);
  const map = new Map();
  const put = (e, source) => {
    const k = lineKey(e);
    if (!map.has(k)) map.set(k, { key: k, client: e.client, project: e.project || "", svc: e.svc, source });
  };

  all.filter((e) => days.includes(e.date)).forEach((e) => put(e, "week"));
  all
    .filter((e) => e.date >= from && e.date < weekStart && !hiddenSet.has(lineKey(e)))
    .forEach((e) => put(e, "carried"));
  extra.forEach((l) => put(l, "added"));
  return [...map.values()];
}
