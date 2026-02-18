"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/services/supabaseClient';
import 'leaflet/dist/leaflet.css';

// Dynamic imports
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const RecenterMap = dynamic(() => import('./RecenterMap'), { ssr: false });

function ParentContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [student, setStudent] = useState<any>(null);
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [icon, setIcon] = useState<any>(null);

  // Load Icon on client side only
  useEffect(() => {
    import('leaflet').then((L) => {
      setIcon(L.default.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854859.png",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      }));
    });
  }, []);

  const handleLogin = async (inputPhone: string) => {
    if (!inputPhone) return;
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*, vehicles(plate_number, driver_name)')
      .eq('parent_phone', inputPhone.trim())
      .single();

    if (data) {
      setStudent(data);
      const { data: rd } = await supabase
        .from('rides')
        .select('*')
        .eq('vehicle_id', data.vehicle_id)
        .maybeSingle(); // Safer than .single()
      setRide(rd);
    } else {
      alert("No student record found for this number.");
    }
    setLoading(false);
  };

  useEffect(() => {
    // FIX: Added optional chaining to resolve the TS error
    const authParam = searchParams?.get('auth');
    if (authParam) {
      setPhone(authParam);
      handleLogin(authParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!student) return;

    // Listen to GPS and Status changes
    const channel = supabase
      .channel(`parent-sync-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `vehicle_id=eq.${student.vehicle_id}` }, 
        (payload) => setRide(payload.new)
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students', filter: `id=eq.${student.id}` }, 
        (payload) => setStudent(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [student]);

  if (!student) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-8 font-sans">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-8 text-center">Track Child</h1>
        <div className="w-full max-w-sm space-y-4">
          <input 
            placeholder="PARENT PHONE NUMBER" 
            className="w-full bg-zinc-100 p-5 rounded-2xl font-bold text-center outline-none border-2 border-transparent focus:border-blue-600"
            value={phone} onChange={e => setPhone(e.target.value)}
          />
          <button onClick={() => handleLogin(phone)} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase italic shadow-xl">
            {loading ? "Finding Bus..." : "Start Tracking"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#F8F9FA]">
      {/* Dynamic Header with Boarding Status */}
      <div className="absolute top-6 left-6 right-6 z-[1000] bg-white p-5 rounded-[2rem] shadow-2xl flex justify-between items-center border border-zinc-100">
        <div>
          <h2 className="text-xl font-black italic uppercase leading-none">{student.name}</h2>
          <p className={`text-[9px] font-black uppercase mt-1 ${student.status === 'Boarded' ? 'text-blue-600' : 'text-zinc-400'}`}>
            Status: {student.status}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black italic text-blue-600 leading-none">{ride?.speed || 0} <span className="text-[10px] not-italic">KM/H</span></p>
          <p className="text-[8px] font-black uppercase text-zinc-300 mt-1">Bus: {student.vehicles?.plate_number}</p>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer 
          center={ride ? [ride.current_lat, ride.current_lng] : [-26.2041, 28.0473]} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {ride && icon && (
            <>
              <Marker position={[ride.current_lat, ride.current_lng]} icon={icon} />
              <RecenterMap lat={ride.current_lat} lng={ride.current_lng} />
            </>
          )}
        </MapContainer>

        {!ride && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[1001] flex items-center justify-center">
            <div className="text-center p-6">
              <p className="font-black uppercase italic text-sm">Bus is currently offline</p>
              <p className="text-[10px] font-bold text-zinc-400 mt-2">Waiting for driver to start the trip...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParentPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black uppercase italic">Loading Portal...</div>}>
      <ParentContent />
    </Suspense>
  );
}