"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/services/supabaseClient';
import 'leaflet/dist/leaflet.css';

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

  useEffect(() => {
    import('leaflet').then((L) => {
      setIcon(L.default.icon({
        // Custom Lime Green Marker for "onthemuv" branding
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      }));
    });

    // AUTO-LOGIN: Check if phone is saved in memory
    const savedPhone = localStorage.getItem('onthemuv_auth');
    if (savedPhone) {
      setPhone(savedPhone);
      handleLogin(savedPhone);
    }
  }, []);

  const handleLogin = async (inputPhone: string) => {
    if (!inputPhone) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*, vehicles(plate_number, driver_name)')
      .eq('parent_phone', inputPhone.trim())
      .single();

    if (data) {
      localStorage.setItem('onthemuv_auth', inputPhone.trim()); // Save to memory
      setStudent(data);
      const { data: rd } = await supabase
        .from('rides')
        .select('*')
        .eq('vehicle_id', data.vehicle_id)
        .maybeSingle();
      setRide(rd);
    } else if (error) {
      console.error(error);
      if (!searchParams?.get('auth')) alert("No student record found for this number.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const authParam = searchParams?.get('auth');
    if (authParam) {
      setPhone(authParam);
      handleLogin(authParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!student) return;
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
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-white">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">on<span className="text-[#CCFF00]">the</span>muv</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12">Parent Portal</p>
        
        <div className="w-full max-w-sm space-y-4">
          <input 
            type="tel"
            placeholder="ENTER PHONE NUMBER" 
            className="w-full bg-zinc-900 text-white p-6 rounded-[2rem] font-bold text-center outline-none border-2 border-transparent focus:border-[#CCFF00] transition-all"
            value={phone} onChange={e => setPhone(e.target.value)}
          />
          <button 
            onClick={() => handleLogin(phone)} 
            className="w-full bg-[#CCFF00] text-black p-6 rounded-[2rem] font-black uppercase italic shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:scale-[0.98] transition-transform"
          >
            {loading ? "Syncing..." : "Start Tracking"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white">
      {/* Floating Status Card */}
      <div className="absolute top-6 left-4 right-4 z-[1000] bg-zinc-900/90 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-zinc-800">
        <div>
          <h2 className="text-xl font-black italic uppercase leading-none">{student.name}</h2>
          <div className="flex items-center gap-2 mt-2">
             <div className={`w-2 h-2 rounded-full animate-pulse ${student.status === 'Boarded' ? 'bg-[#CCFF00]' : 'bg-zinc-600'}`} />
             <p className="text-[10px] font-black uppercase text-zinc-400">
               {student.status || 'At Home'}
             </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black italic text-[#CCFF00] leading-none">
            {ride?.speed || 0} <span className="text-[10px] not-italic text-white">KM/H</span>
          </p>
          <p className="text-[8px] font-black uppercase text-zinc-500 mt-1">{student.vehicles?.plate_number}</p>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer 
          center={ride ? [ride.current_lat, ride.current_lng] : [-26.2041, 28.0473]} 
          zoom={16} 
          style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} 
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[1001] flex items-center justify-center">
            <div className="text-center p-8 bg-zinc-900 rounded-[3rem] border border-zinc-800">
              <div className="w-12 h-1 bg-[#CCFF00] mx-auto mb-4 rounded-full opacity-20" />
              <p className="font-black uppercase italic text-sm tracking-widest text-[#CCFF00]">Vehicle Offline</p>
              <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase">Awaiting driver ignition...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParentPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center font-black uppercase italic text-[#CCFF00]">Initializing...</div>}>
      <ParentContent />
    </Suspense>
  );
}