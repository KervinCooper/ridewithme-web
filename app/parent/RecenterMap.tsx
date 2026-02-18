"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}