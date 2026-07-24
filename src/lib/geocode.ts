/**
 * Looks up coordinates for a "City, Region" string via OpenStreetMap's
 * Nominatim geocoder. Returns nulls on any failure so a bad/ambiguous
 * location never blocks saving the win.
 */
export async function geocodeLocation(
  location: string,
): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      location,
    )}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "forehead-mystery/1.0 (winners map geocoding)",
      },
    });
    if (!response.ok) return { lat: null, lng: null };

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    if (!first) return { lat: null, lng: null };

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { lat: null, lng: null };
    }
    return { lat, lng };
  } catch (error) {
    console.error("[geocodeLocation] failed", { error, location });
    return { lat: null, lng: null };
  }
}
