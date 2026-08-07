"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapMarker } from "./map-view";

// Fix default Leaflet icon paths which get broken by Next.js/Webpack bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapComponentProps {
  markers: MapMarker[];
  center: { lat: number; lng: number };
  zoom: number;
  height: string | number;
}

export default function MapComponent({ markers, center, zoom, height }: MapComponentProps) {
  return (
    <div style={{ height, width: "100%", borderRadius: "inherit" }} className="relative overflow-hidden">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, index) => (
          <Marker key={marker.id || index} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{marker.label}</p>
                {marker.sublabel && <p className="text-muted-foreground mt-0.5">{marker.sublabel}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
