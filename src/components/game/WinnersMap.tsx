"use client";

import { useEffect, useRef } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { WinnerRecord } from "@/lib/winners";
import WinnerPopupCard from "./WinnerPopupCard";

type WinnersMapProps = {
  winners: WinnerRecord[];
};

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;

// Inline SVG pin, avoids Leaflet's default marker icon (its image paths
// break under Next's bundler unless separately worked around). The center
// shows the number of wins recorded at that pin's location.
function pinIconHtml(winCount: number): string {
  const label = winCount > 99 ? "99+" : String(winCount);
  const fontSize = label.length > 2 ? 8 : 10;
  return `
    <svg width="25" height="34" viewBox="0 0 25 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 22 12.5 34 12.5 34S25 22 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#e11d48"/>
      <circle cx="12.5" cy="12.5" r="8" fill="white"/>
      <text x="12.5" y="12.5" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="700" font-family="sans-serif" fill="#e11d48">${label}</text>
    </svg>
  `;
}

export default function WinnersMap({ winners }: WinnersMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const popupRootsRef = useRef<Root[]>([]);

  const pins = winners.filter(
    (winner): winner is WinnerRecord & { lat: number; lng: number } =>
      typeof winner.lat === "number" && typeof winner.lng === "number",
  );

  // Winners sharing the same location are grouped so their pin's popup can
  // carousel between them instead of stacking duplicate markers.
  const groups = new Map<string, (WinnerRecord & { lat: number; lng: number })[]>();
  for (const winner of pins) {
    const key = winner.location;
    const group = groups.get(key);
    if (group) {
      group.push(winner);
    } else {
      groups.set(key, [winner]);
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      L.control.zoom({ position: "bottomleft" }).addTo(map);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markers = Array.from(groups.values()).map((group) => {
        const popupContainer = document.createElement("div");
        const root = createRoot(popupContainer);
        root.render(<WinnerPopupCard winners={group} />);
        popupRootsRef.current.push(root);

        const pinIcon = L.divIcon({
          html: pinIconHtml(group.length),
          className: "",
          iconSize: [25, 34],
          iconAnchor: [12.5, 34],
          popupAnchor: [0, -30],
        });

        const [{ lat, lng }] = group;
        return L.marker([lat, lng], { icon: pinIcon })
          .addTo(map)
          .bindPopup(popupContainer);
      });

      if (markers.length > 0) {
        const bounds = L.latLngBounds(
          markers.map((marker) => marker.getLatLng()),
        );
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
      }
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      for (const root of popupRootsRef.current) {
        root.unmount();
      }
      popupRootsRef.current = [];
    };
    // Pins are derived from `winners` on every render, but the map itself is
    // only ever created once per mount — rebuilding it per-pin-change isn't
    // needed since this page is server-rendered fresh on each load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pins.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No winners with a recognized location yet.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-96 w-full rounded-xl border border-slate-200"
    />
  );
}
