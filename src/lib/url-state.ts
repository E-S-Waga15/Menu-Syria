"use client";

import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";

/**
 * Drop-in replacements for `useState` that persist to the page's own query
 * string instead of component state — so a filter/sort/page survives a back
 * navigation (open a result, hit back, the list is exactly as it was) the
 * way any serious directory (Amazon, Linear, …) behaves, instead of
 * resetting the moment the component unmounts. Each returns the same
 * `[value, setValue]` shape `useState` does, so swapping one in place of the
 * other is the only change a list component needs.
 *
 * `clearOnDefault: true` on every parser keeps URLs clean — a filter left at
 * its default (page 1, "all", empty search) never shows up in the query
 * string at all, only a filter actually applied does.
 */

/** `?page=2` — 1 when absent, omitted from the URL on page 1. */
export function usePageParam(key = "page") {
  return useQueryState(
    key,
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true }),
  );
}

/** `?q=...` — free-text search, empty string when absent. */
export function useSearchParam(key = "q") {
  return useQueryState(
    key,
    parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  );
}

/**
 * A single-value filter (governorate id, status, role, …) — `allValue` is
 * both the default and what's written back when the picker is reset,
 * keeping the "all" state out of the URL entirely.
 */
export function useFilterParam(key: string, allValue = "all") {
  return useQueryState(
    key,
    parseAsString.withDefault(allValue).withOptions({ clearOnDefault: true }),
  );
}

/** A sort filter restricted to a known set of values. */
export function useSortParam<T extends string>(
  values: readonly T[],
  defaultValue: T,
  key = "sort",
) {
  return useQueryState(
    key,
    parseAsStringEnum([...values])
      .withDefault(defaultValue)
      .withOptions({ clearOnDefault: true }),
  );
}
