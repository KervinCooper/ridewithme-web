export const BRAND = {
  name: "onthemuv",
  tagline: "Smart Transit Systems",
  footer: "© 2026 ONTHEMUV TRANSIT SOLUTIONS",
} as const;

// Default Fleet Command / Parent map center — Gauteng, ZA (matches current app/admin + app/parent).
export const DEFAULT_MAP_CENTER: [number, number] = [-26.2, 28.0];
export const ADMIN_MAP_ZOOM = 12;
export const PARENT_MAP_ZOOM = 16;

export const SPEEDING_THRESHOLD_KMH = 80;

export const TOAST_DURATION_MS = 4000;

export const STORAGE_KEYS = {
  adminAuth: "muv_admin_auth",
  driverReg: "muv_driver_reg",
  driverPin: "muv_driver_pin",
  driverTheme: "muv_theme",
  parentAuth: "onthemuv_auth",
  appVersion: "on_the_muv_version",
} as const;
