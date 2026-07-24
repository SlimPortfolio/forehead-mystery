// Lazy-loaded lookup of US cities keyed by state abbreviation.
// The dataset (~330KB) is only fetched the first time a lookup is needed,
// so it never lands in the initial page bundle.

type CityMap = Record<string, string[]>;

let cache: CityMap | null = null;
let pending: Promise<CityMap> | null = null;

async function loadCityMap(): Promise<CityMap> {
  if (cache) return cache;
  if (!pending) {
    pending = import("./us-cities.json").then((mod) => {
      cache = (mod.default ?? mod) as CityMap;
      return cache;
    });
  }
  return pending;
}

/** Cities for a given state abbreviation (e.g. "TX"), sorted alphabetically. */
export async function getCitiesForState(state: string): Promise<string[]> {
  if (!state) return [];
  const map = await loadCityMap();
  return map[state] ?? [];
}
