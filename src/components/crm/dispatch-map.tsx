"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const RUN_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

const UNASSIGNED_COLOR = "#6b7280"; // gray
const ASSEMBLY_COLOR = "#dc2626"; // red

function makeHotelIcon(color: string, pax: number) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:${color};
        color:#fff;
        border-radius:50%;
        width:36px;height:36px;
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        font-size:11px;font-weight:700;
        border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        line-height:1.1;
        ">
        <span>${pax}</span>
        <span style="font-size:7px;font-weight:400;">pax</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function makeAssemblyIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:#dc2626;
        color:#fff;
        border-radius:4px;
        padding:4px 8px;
        font-size:11px;font-weight:700;
        border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        white-space:nowrap;
        ">
        📍 Assembly
      </div>`,
    iconSize: [100, 30],
    iconAnchor: [50, 30],
  });
}

export interface HotelPin {
  id: string;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  pax: number;
  runIndex: number | null; // null = unassigned
}

interface AssemblyPoint {
  lat: number;
  lng: number;
  name: string;
}

interface DispatchMapProps {
  hotels: HotelPin[];
  assembly: AssemblyPoint | null;
  onAssemblyPlace: (lat: number, lng: number) => void;
  onHotelClick?: (hotelId: string) => void;
  placingAssembly: boolean;
}

function MapClickHandler({
  enabled,
  onPlace,
}: {
  enabled: boolean;
  onPlace: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onPlace(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function DispatchMap({
  hotels,
  assembly,
  onAssemblyPlace,
  onHotelClick,
  placingAssembly,
}: DispatchMapProps) {
  const mappable = hotels.filter((h) => h.latitude != null && h.longitude != null);

  // Default center: Cairo area (fallback if no hotels have coordinates)
  const defaultCenter: [number, number] =
    mappable.length > 0
      ? [mappable[0].latitude!, mappable[0].longitude!]
      : [27.2578, 33.8116]; // Hurghada

  const assemblyIcon = makeAssemblyIcon();

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      style={{ height: "100%", width: "100%", borderRadius: "8px", cursor: placingAssembly ? "crosshair" : "grab" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler enabled={placingAssembly} onPlace={onAssemblyPlace} />

      {/* Hotel markers */}
      {mappable.map((h) => {
        const color =
          h.runIndex !== null ? RUN_COLORS[h.runIndex % RUN_COLORS.length] : UNASSIGNED_COLOR;
        return (
          <Marker
            key={h.id}
            position={[h.latitude!, h.longitude!]}
            icon={makeHotelIcon(color, h.pax)}
            eventHandlers={{ click: () => onHotelClick?.(h.id) }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{h.name}</p>
                <p className="text-muted-foreground text-xs">{h.code}</p>
                <p className="mt-1 font-medium">{h.pax} pax</p>
                {h.runIndex !== null && (
                  <p className="text-xs" style={{ color: RUN_COLORS[h.runIndex % RUN_COLORS.length] }}>
                    Run {h.runIndex + 1}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Assembly point marker */}
      {assembly && (
        <Marker position={[assembly.lat, assembly.lng]} icon={assemblyIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-red-600">Assembly Point</p>
              <p>{assembly.name || "Unnamed"}</p>
              <p className="text-xs text-muted-foreground">
                {assembly.lat.toFixed(5)}, {assembly.lng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
