"use client";
import { useEffect } from "react";

export default function PWAUpdater() {
  useEffect(() => {
    // Change this string every time you deploy a major update!
    // Example: change to "1.0.2" for the next update.
    const APP_VERSION = "1.0.1"; 
    
    const currentVersion = localStorage.getItem("on_the_muv_version");

    if (currentVersion !== APP_VERSION) {
      localStorage.setItem("on_the_muv_version", APP_VERSION);
      
      // Clear the service worker/browser caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Force a hard reload from the server
      window.location.reload(); 
    }
  }, []);

  return null;
}