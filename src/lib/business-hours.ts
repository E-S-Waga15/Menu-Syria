import type { DayHours } from "@/lib/types";

/** every business on this platform operates in Syria — "now" for opening-hours
 * purposes always means Damascus local time, regardless of the visitor's own
 * timezone or the server rendering the page */
const DAMASCUS_TZ = "Asia/Damascus";
const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function damascusNow(now: Date): { dayIndex: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAMASCUS_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return {
    dayIndex: Math.max(0, WEEKDAY_ORDER.indexOf(weekday)),
    minutes: hour * 60 + minute,
  };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface BusinessOpenStatus {
  isOpen: boolean;
  /** the next "HH:mm" the business opens, when currently closed and a
   * future opening time is known from the published schedule */
  opensAt: string | null;
  /** how many days from now that next opening falls — 0 = later today,
   * 1 = tomorrow, 2–6 = that many days out. `null` alongside a null
   * `opensAt` (no published hours ahead to find). */
  opensInDays: number | null;
  /** 0–6 (Sun–Sat), the weekday the next opening falls on — pairs with
   * `opensInDays` for a day-name lookup (e.g. `t.restaurant.dayNames`)
   * when the next opening isn't today or tomorrow. */
  opensDayIndex: number | null;
}

/**
 * Derives whether a business is open right now from its published weekly
 * hours (index 0 = Sunday), instead of a manually-toggled flag that drifts
 * out of sync with the business's actual schedule. A business that never
 * published hours at all is treated as open — we can't block ordering on a
 * schedule that was never set, that would just break every business that
 * hasn't filled this in yet.
 */
export function getBusinessOpenStatus(
  hours: (DayHours | null)[] | undefined,
  now: Date = new Date(),
): BusinessOpenStatus {
  if (!hours || hours.length === 0)
    return { isOpen: true, opensAt: null, opensInDays: null, opensDayIndex: null };

  const { dayIndex, minutes } = damascusNow(now);
  const today = hours[dayIndex];
  if (today) {
    const opens = toMinutes(today.opens);
    const closes = toMinutes(today.closes);
    // an overnight range (e.g. 18:00–02:00) wraps past midnight
    const isOpenNow =
      closes > opens
        ? minutes >= opens && minutes < closes
        : minutes >= opens || minutes < closes;
    if (isOpenNow)
      return { isOpen: true, opensAt: null, opensInDays: null, opensDayIndex: null };
  }

  // closed right now — walk forward (starting today) to the next day with
  // published hours, and report when it opens
  for (let offset = 0; offset < 7; offset++) {
    const idx = (dayIndex + offset) % 7;
    const day = hours[idx];
    if (!day) continue;
    if (offset === 0 && toMinutes(day.opens) <= minutes) continue; // today's window already passed
    return { isOpen: false, opensAt: day.opens, opensInDays: offset, opensDayIndex: idx };
  }
  return { isOpen: false, opensAt: null, opensInDays: null, opensDayIndex: null };
}
