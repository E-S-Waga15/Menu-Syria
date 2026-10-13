import { CalendarClock, Clock } from "lucide-react";

import type { Dictionary } from "@/i18n/get-dictionary";
import type { DayHours } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Opening hours, with an honest empty state.
 *
 * "Not published" and "closed" are different facts, and conflating them tells
 * a visitor the place is shut when nobody has filled the field in. An absent
 * array says the first; a `null` day says the second.
 *
 * Today is marked rather than pulled to the top — the week stays in its normal
 * order so the reader can scan for the day they actually care about.
 */
export function OpeningHours({
  hours,
  t,
}: {
  hours?: (DayHours | null)[];
  t: Dictionary;
}) {
  if (!hours || hours.length === 0) {
    return (
      <p className="flex items-center gap-2.5 rounded-xl border border-dashed border-border px-4 py-3.5 text-sm text-muted-foreground">
        <CalendarClock className="size-4 shrink-0" />
        {t.restaurant.hoursNotSet}
      </p>
    );
  }

  const today = new Date().getDay();

  return (
    <ul className="space-y-1">
      {hours.map((day, index) => {
        const isToday = index === today;
        return (
          <li
            key={t.restaurant.dayNames[index]}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm",
              isToday && "bg-primary/8 font-bold",
            )}
          >
            <span className="flex items-center gap-2">
              {isToday && <Clock className="size-3.5 text-primary" />}
              <span className={cn(!isToday && "text-muted-foreground")}>
                {t.restaurant.dayNames[index]}
              </span>
              {isToday && (
                <span className="label-eyebrow text-primary">
                  {t.restaurant.today}
                </span>
              )}
            </span>
            {day ? (
              <span
                className={cn("tabular-nums", isToday && "text-primary")}
                dir="ltr"
              >
                {day.opens} — {day.closes}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t.restaurant.closedDay}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
