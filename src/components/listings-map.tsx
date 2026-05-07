"use client";

// Map view for /listings/land. Loads Google Maps JS SDK on demand using a
// public key passed in as a prop (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in the
// caller's env). If the key isn't set, renders a friendly placeholder
// telling the admin to add one — the rest of the page still works.
//
// Each listing is plotted at its state centroid (with a small deterministic
// jitter so multiple listings in the same state don't stack). When we
// later add per-listing geocoding, the same component takes precise
// lat/long via props instead.
//
// Layout modes:
//   - "fixed":  card-style with chrome — used when the map is the whole
//               feature (legacy ?view=map URL).
//   - "split":  fills its parent box edge-to-edge — used when the map sits
//               next to the listings list in the split view, where the
//               parent already provides the rounded chrome.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { centroidForState, jitterPin } from "@/lib/state-centroids";

export type MapListing = {
  id: string;
  title: string;
  state: string | null;
  county: string | null;
  availableMW: number;
  acres: number;
  ppaStatus: string | null;
  pricingModel: string;
  askingPrice: number | null;
};

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => unknown;
        Marker: new (opts: object) => { addListener: (e: string, f: () => void) => void };
        InfoWindow: new (opts: object) => {
          open: (map: unknown, marker: unknown) => void;
          close: () => void;
          setContent?: (html: string) => void;
        };
        SymbolPath?: { CIRCLE: number };
      };
    };
    __livioMapsLoaded?: boolean;
    __livioMapsLoading?: Promise<void>;
  }
}

function loadMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.__livioMapsLoaded) return Promise.resolve();
  if (window.__livioMapsLoading) return window.__livioMapsLoading;
  window.__livioMapsLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      window.__livioMapsLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error("Failed to load Google Maps JS SDK"));
    document.head.appendChild(s);
  });
  return window.__livioMapsLoading;
}

// Soft, low-saturation map style — keeps emerald pins as the only loud
// element on screen. Loosely inspired by the "Snazzy / Subtle Grayscale"
// preset: roads pulled back to slate, water muted to a calm blue-grey,
// labels demoted so the data points pop.
const MAP_STYLE: object[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f6f7" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#e5e7eb" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d1d5db" }] },
  { featureType: "road.arterial", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
];

export function ListingsMap({
  listings,
  apiKey,
  layout = "fixed",
  height,
}: {
  listings: MapListing[];
  apiKey: string | null;
  layout?: "fixed" | "split";
  height?: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setError("missing-key");
      return;
    }
    let cancelled = false;
    loadMaps(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current || !window.google) return;

        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 39.5, lng: -98.5 },
          zoom: 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: MAP_STYLE,
        });

        const infoWindow = new window.google.maps.InfoWindow({});

        listings.forEach((l) => {
          const c = centroidForState(l.state);
          if (!c) return;
          const pos = jitterPin(c, l.id);
          const marker = new window.google!.maps.Marker({
            position: pos,
            map,
            title: l.title,
            icon: {
              path: window.google!.maps.SymbolPath?.CIRCLE ?? 0,
              fillColor: "#047857",
              fillOpacity: 0.95,
              strokeColor: "#ffffff",
              strokeWeight: 2.5,
              scale: 10,
            },
          });
          marker.addListener("click", () => {
            const priceLine = l.askingPrice
              ? `<div style="font-size:12px;color:#475569;margin-top:4px;">$${(l.askingPrice / 1_000_000).toFixed(1)}M asking · ${Math.round(l.askingPrice / l.availableMW / 1000)}k/MW</div>`
              : "";
            infoWindow.close();
            const safeTitle = l.title.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
            infoWindow.setContent?.(
              `<div style="font-family:system-ui,sans-serif;max-width:240px;">
                <div style="font-weight:600;color:#0f172a;font-size:14px;line-height:1.3;">${safeTitle}</div>
                <div style="font-size:12px;color:#047857;font-weight:600;margin-top:4px;">${l.availableMW} MW · ${l.acres} acres · PPA ${l.ppaStatus ?? "—"}</div>
                ${priceLine}
                <a href="/listings/land/${l.id}" style="display:inline-block;margin-top:8px;color:#047857;font-weight:600;font-size:13px;text-decoration:none;">Open listing →</a>
              </div>`,
            );
            infoWindow.open(map, marker);
          });
        });

        (map as { addListener?: (e: string, f: () => void) => void }).addListener?.(
          "click",
          () => {
            infoWindow.close();
          },
        );
      })
      .catch((e: Error) => {
        if (cancelled) return;
        console.error("[listings-map]", e);
        setError(e.message || "Failed to load map");
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, listings]);

  if (error === "missing-key") {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 h-full flex items-center justify-center">
        <div>
          <strong className="font-semibold">Map view needs a Google Maps API key.</strong>
          <div className="mt-2">
            Set <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
            in Railway → livio-land → Variables, then redeploy.
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-6 text-sm text-red-900 h-full flex items-center justify-center">
        Couldn&apos;t load the map: {error}.
      </div>
    );
  }

  // Split mode — used inside the split-view shell, which already has its
  // own chrome. Map fills its parent edge-to-edge.
  if (layout === "split") {
    return (
      <>
        <div ref={mapRef} className="h-full w-full" style={height ? { height } : undefined} />
        <ul className="sr-only">
          {listings.map((l) => (
            <li key={l.id}>
              <Link href={`/listings/land/${l.id}`}>{l.title}</Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  // Fixed (legacy) mode — full-width card with chrome and footnote.
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div ref={mapRef} className="h-[560px] w-full" style={height ? { height } : undefined} />
      <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] text-neutral-500">
        Pins show approximate state centroid — click for site details. Per-listing precision shipping after geocoding rolls out.
      </div>
      <ul className="sr-only">
        {listings.map((l) => (
          <li key={l.id}>
            <Link href={`/listings/land/${l.id}`}>{l.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

