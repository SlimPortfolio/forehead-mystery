// Lazy-loaded lookup of major world cities keyed by country name.
// Limited to large, well-known cities (generally population >= 100k, with a
// handful of top cities for smaller countries). The US is intentionally
// excluded here — it has its own state-level city lookup.

type CityMap = Record<string, string[]>;

let cache: CityMap | null = null;
let pending: Promise<CityMap> | null = null;

async function loadCityMap(): Promise<CityMap> {
  if (cache) return cache;
  if (!pending) {
    pending = import("./world-cities.json").then((mod) => {
      cache = (mod.default ?? mod) as CityMap;
      return cache;
    });
  }
  return pending;
}

/** Alphabetical list of supported countries. */
export async function getCountries(): Promise<string[]> {
  const map = await loadCityMap();
  return Object.keys(map);
}

/** Major cities for a given country name, sorted alphabetically. */
export async function getCitiesForCountry(country: string): Promise<string[]> {
  if (!country) return [];
  const map = await loadCityMap();
  return map[country] ?? [];
}
