"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function Map({ pickupCoords, dropoffCoords, userLocation, routeCoords, defaultCenter = [22.5726, 88.3639], defaultZoom = 13 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const initialized = useRef(false);

  const updateMap = useCallback(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds = [];
    let hasPickup = false, hasDropoff = false;

    if (userLocation && !pickupCoords && !dropoffCoords) {
      const userIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup("Your Location");
      markersRef.current.push(marker);
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    if (pickupCoords) {
      const pickupIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:#22c55e;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const marker = L.marker([parseFloat(pickupCoords.lat), parseFloat(pickupCoords.lon)], { icon: pickupIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup("Pickup Location");
      markersRef.current.push(marker);
      bounds.push([parseFloat(pickupCoords.lat), parseFloat(pickupCoords.lon)]);
      hasPickup = true;
    }

    if (dropoffCoords) {
      const dropoffIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const marker = L.marker([parseFloat(dropoffCoords.lat), parseFloat(dropoffCoords.lon)], { icon: dropoffIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup("Drop-off Location");
      markersRef.current.push(marker);
      bounds.push([parseFloat(dropoffCoords.lat), parseFloat(dropoffCoords.lon)]);
      hasDropoff = true;
    }

    console.log("Map update - routeCoords:", routeCoords?.length, "pickup:", !!pickupCoords, "dropoff:", !!dropoffCoords);
    
    if (hasPickup && hasDropoff) {
      const pickupPt = [parseFloat(pickupCoords.lat), parseFloat(pickupCoords.lon)];
      const dropoffPt = [parseFloat(dropoffCoords.lat), parseFloat(dropoffCoords.lon)];
      
      if (routeCoords && routeCoords.length > 0) {
        const linePoints = routeCoords.map(coord => [coord[1], coord[0]]);
        polylineRef.current = L.polyline(linePoints, {
          color: "#3b82f6",
          weight: 5,
          opacity: 1
        }).addTo(mapInstanceRef.current);
      } else {
        polylineRef.current = L.polyline([pickupPt, dropoffPt], {
          color: "#ef4444",
          weight: 3,
          opacity: 0.7,
          dashArray: "5, 10"
        }).addTo(mapInstanceRef.current);
      }
      
      if (bounds.length >= 2) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (hasPickup || hasDropoff) {
      const center = pickupCoords 
        ? [parseFloat(pickupCoords.lat), parseFloat(pickupCoords.lon)]
        : [parseFloat(dropoffCoords.lat), parseFloat(dropoffCoords.lon)];
      mapInstanceRef.current.setView(center, defaultZoom);
    } else if (userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], defaultZoom);
    }
    
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
  }, [pickupCoords, dropoffCoords, userLocation, routeCoords]);

  useEffect(() => {
    if (!initialized.current && typeof window !== "undefined") {
      const initCenter = pickupCoords 
        ? [parseFloat(pickupCoords.lat), parseFloat(pickupCoords.lon)]
        : userLocation 
          ? [userLocation.lat, userLocation.lng]
          : defaultCenter;

      mapInstanceRef.current = L.map(mapRef.current).setView(initCenter, defaultZoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
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
    updateMap();
  }, [updateMap]);

  return (
    <div 
      ref={mapRef} 
      style={{ width: "100%", height: "100%" }}
    />
  );
}