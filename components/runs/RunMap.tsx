'use client';

import { useEffect, useRef } from 'react';

interface RunMapProps {
  polyline: string;
}

// Decode Google/Strava encoded polyline to [lat, lng] pairs
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export default function RunMap({ polyline }: RunMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || !polyline) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      // Clean up previous instance
      if (instanceRef.current) {
        (instanceRef.current as { remove: () => void }).remove();
        instanceRef.current = null;
      }

      const coords = decodePolyline(polyline);
      if (coords.length === 0) return;

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      const line = L.polyline(coords, { color: '#ef4444', weight: 3, opacity: 0.9 }).addTo(map);

      // Start/end markers
      if (coords.length > 0) {
        const dotIcon = (color: string) => L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker(coords[0], { icon: dotIcon('#10b981') }).addTo(map);
        L.marker(coords[coords.length - 1], { icon: dotIcon('#ef4444') }).addTo(map);
      }

      map.fitBounds(line.getBounds(), { padding: [16, 16] });
      instanceRef.current = map;
    });

    return () => {
      if (instanceRef.current) {
        (instanceRef.current as { remove: () => void }).remove();
        instanceRef.current = null;
      }
    };
  }, [polyline]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={mapRef}
        style={{ width: '100%', height: 280, borderRadius: 4, overflow: 'hidden', background: '#111' }}
      />
    </>
  );
}
