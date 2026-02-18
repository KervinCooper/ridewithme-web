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

  // PWA Prompt States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showiOSGuide, setShowiOSGuide] = useState(false);

  useEffect(() => {
    import('leaflet').then((L) => {
      setIcon(L.default.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      }));
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const savedPhone = localStorage.getItem('onthemuv_auth');
    if (savedPhone) {
      setPhone(savedPhone);
      handleLogin(savedPhone);
    }
  }, []);

  const handleLogin = async (inputPhone: string) => {
    if (!inputPhone) return;
    
    // Trigger PWA Check
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) { setShowiOSGuide(true); return; }
    if (deferredPrompt) { deferredPrompt.prompt(); setDeferredPrompt(null); }

    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*, vehicles(plate_number, driver_name)')
      .eq('parent_phone', inputPhone.trim())
      .single();

    if (data) {
      localStorage.setItem('onthemuv_auth', inputPhone.trim());
      setStudent(data);
      const { data: rd } = await supabase.from('rides').select('*').eq('vehicle_id', data.vehicle_id).maybeSingle();
      setRide(rd);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!student) return;
    const channel = supabase.channel(`parent-sync-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `vehicle_id=eq.${student.vehicle_id}` }, 
        (payload) => setRide(payload.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students', filter: `id=eq.${student.id}` }, 
        (payload) => setStudent(payload.new))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [student]);

  if (!student) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-white">
        <div className="w-16 h-16 bg-[#CCFF00] rounded-2xl mb-6 flex items-center justify-center shadow-lg"><span className="text-black font-black italic text-2xl">M</span></div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2 text-center leading-none">on<span className="text-[#CCFF00]">the</span>muv</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12">Parent Portal</p>
        
        <div className="w-full max-w-sm space-y-4">
          <input type="tel" placeholder="PHONE NUMBER" className="w-full bg-zinc-900 text-white p-6 rounded-[2rem] font-bold text-center outline-none border-2 border-transparent focus:border-[#CCFF00]" value={phone} onChange={e => setPhone(e.target.value)} />
          <button onClick={() => handleLogin(phone)} className="w-full bg-[#CCFF00] text-black p-6 rounded-[2rem] font-black uppercase italic shadow-xl transition-all active:scale-95">
            {loading ? "Syncing..." : "Start Tracking"}
          </button>
        </div>

        {showiOSGuide && (
          <div className="absolute inset-0 bg-black/95 z-[2000] flex flex-col items-center justify-center p-10 text-center">
            <h2 className="text-[#CCFF00] text-xl font-black uppercase italic mb-4">Install App</h2>
            <p className="text-zinc-400 text-sm mb-8">Tap the <span className="text-white">Share icon</span> and <span className="text-white">"Add to Home Screen"</span> for the best tracking experience.</p>
            <button onClick={() => setShowiOSGuide(false)} className="bg-white text-black px-8 py-3 rounded-xl font-black uppercase text-xs">Got it</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white">
      <div className="absolute top-6 left-4 right-4 z-[1000] bg-zinc-900/90 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-zinc-800">
        <div>
          <h2 className="text-xl font-black italic uppercase leading-none">{student.name}</h2>
          <div className="flex items-center gap-2 mt-2">
             <div className={`w-2 h-2 rounded-full animate-pulse ${student.status === 'Picked Up' ? 'bg-[#CCFF00]' : 'bg-zinc-600'}`} />
             <p className="text-[10px] font-black uppercase text-zinc-400">{student.status || 'At Home'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black italic text-[#CCFF00] leading-none">{ride?.speed || 0} <span className="text-[10px] not-italic text-white">KM/H</span></p>
          <p className="text-[8px] font-black uppercase text-zinc-500 mt-1">{student.vehicles?.plate_number}</p>
        </div>
      </div>
      <MapContainer center={ride ? [ride.current_lat, ride.current_lng] : [-26, 28]} zoom={16} style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {ride && icon && <><Marker position={[ride.current_lat, ride.current_lng]} icon={icon} /><RecenterMap lat={ride.current_lat} lng={ride.current_lng} /></>}
      </MapContainer>
      {!ride && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[1001] flex items-center justify-center">
          <div className="text-center p-8 bg-zinc-900 rounded-[3rem] border border-zinc-800">
            <p className="font-black uppercase italic text-sm text-[#CCFF00]">Vehicle Offline</p>
            <p className="text-[10px] font-bold text-zinc-500 mt-2">Awaiting driver ignition...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-[#CCFF00] font-black italic uppercase">Loading Portal...</div>}>
      <ParentContent />
    </Suspense>
  );
}