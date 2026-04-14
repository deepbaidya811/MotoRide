"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function RiderMap({ riderLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && typeof window !== "undefined") {
      const center = riderLocation ? [riderLocation.lat, riderLocation.lng] : [22.5726, 88.3639];
      mapInstanceRef.current = L.map(mapRef.current).setView(center, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
      }).addTo(mapInstanceRef.current);
      initialized.current = true;
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initialized.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && riderLocation) {
      if (markerRef.current) markerRef.current.remove();
      const icon = L.divIcon({
        className: "custom-marker",
        html: "<div style=\"background:#22c55e;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)\"></div>",
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      markerRef.current = L.marker([riderLocation.lat, riderLocation.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup("Your Location");
      mapInstanceRef.current.setView([riderLocation.lat, riderLocation.lng], 14);
    }
  }, [riderLocation]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}