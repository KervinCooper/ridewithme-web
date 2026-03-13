"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], map.getZoom(), {
        animate: true,
        duration: 1.5 // Smooth 1.5 second glide
      });
    }
  }, [lat, lng, map]);
  return null;
}