// Google Maps custom style (Android only — Apple Maps ignores this prop).
// Rough dark "fleet command" look, standing in for the old Leaflet dark tile layer.
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#121317' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08090b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3b0' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#262a33' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1c22' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#08090b' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#08090b' }] },
];
