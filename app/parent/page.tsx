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
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) { setShowiOSGuide(true); return; }
    if (deferredPrompt) { deferredPrompt.prompt(); setDeferredPrompt(null); }

    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*, vehicles(plate_number, driver_name, status)')
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicles', filter: `id=eq.${student.vehicle_id}` }, 
        (payload) => setStudent((prev: any) => ({ ...prev, vehicles: { ...prev.vehicles, status: payload.new.status } })))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [student]);

  if (!student) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
        <div className="w-16 h-16 bg-[#CCFF00] rounded-2xl mb-6 flex items-center justify-center shadow-lg"><span className="text-black font-black italic text-2xl">M</span></div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2 text-center leading-none">on<span className="text-[#CCFF00]">the</span>muv</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12">Parent Portal</p>
        
        <div className="w-full max-w-sm space-y-4">
          <input type="tel" placeholder="PHONE NUMBER" className="w-full bg-zinc-900 text-white p-6 rounded-[2rem] font-bold text-center outline-none border-2 border-transparent focus:border-[#CCFF00]" value={phone} onChange={e => setPhone(e.target.value)} />
          <button onClick={() => handleLogin(phone)} className="w-full bg-[#CCFF00] text-black p-6 rounded-[2rem] font-black uppercase italic shadow-xl transition-all active:scale-95 text-lg">
            {loading ? "Syncing..." : "Start Tracking"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-black text-white relative overflow-hidden">
      
      {/* 5-MINUTE WARNING OVERLAY */}
      {student.status === 'Arriving in 5 mins' && (
        <div className="absolute inset-0 bg-yellow-500/95 backdrop-blur-md z-[2000] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 animate-bounce shadow-2xl">
            <span className="text-yellow-500 text-4xl font-black">🔔</span>
          </div>
          <h1 className="text-5xl font-black italic uppercase text-black mb-2 leading-none">Driver Approaching</h1>
          <p className="text-yellow-900 text-sm font-black uppercase tracking-widest mb-8">Arriving in 5 Minutes</p>
          <div className="bg-black text-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border-4 border-yellow-400">
            <p className="text-base font-bold mb-2">Please ensure {student.name} is ready at the pickup point.</p>
            <p className="text-[#CCFF00] text-[10px] font-black uppercase tracking-widest mt-4">Screen will clear on pickup</p>
          </div>
        </div>
      )}

      {/* SOS EMERGENCY OVERLAY */}
      {student.vehicles?.status === 'SOS' && (
        <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md z-[2001] flex flex-col items-center justify-center p-8 text-center border-4 border-red-600">
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.5)]">
            <span className="text-white text-4xl font-black">!</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase text-white mb-2 leading-tight">Route Delayed</h1>
          <p className="text-red-300 text-sm font-bold uppercase tracking-widest mb-8">Driver has reported an issue</p>
          <div className="bg-black/50 p-6 rounded-3xl border border-red-800 w-full max-w-sm">
            <p className="text-white text-xs mb-4">The association dispatch team has been notified and is currently managing the situation. Your child is secure.</p>
            <p className="text-[#CCFF00] text-[10px] font-black uppercase tracking-widest">Do not panic. Updates will follow.</p>
          </div>
        </div>
      )}

      {/* Main UI Header */}
      <div className="absolute top-6 left-4 right-4 z-[1000] bg-zinc-900/90 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-black italic uppercase leading-none">{student.name}</h2>
          <div className="flex items-center gap-2 mt-2">
             <div className={`w-2 h-2 rounded-full animate-pulse ${student.status === 'Picked Up' ? 'bg-[#CCFF00]' : 'bg-zinc-600'}`} />
             <p className="text-[10px] font-black uppercase text-zinc-400">{student.status || 'At Home'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl md:text-4xl font-black italic text-[#CCFF00] leading-none">{ride?.speed || 0} <span className="text-[10px] not-italic text-white">KM/H</span></p>
          <p className="text-[8px] font-black uppercase text-zinc-500 mt-1">{student.vehicles?.plate_number}</p>
        </div>
      </div>
      
      {/* Map */}
      <MapContainer center={ride ? [ride.current_lat, ride.current_lng] : [-26.2, 28.0]} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {ride && icon && <><Marker position={[ride.current_lat, ride.current_lng]} icon={icon} /><RecenterMap lat={ride.current_lat} lng={ride.current_lng} /></>}
      </MapContainer>
      
      {/* Offline Overlay */}
      {!ride && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[1001] flex items-center justify-center">
          <div className="text-center p-8 bg-zinc-900 rounded-[3rem] border border-zinc-800 shadow-2xl">
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
    <Suspense fallback={<div className="h-[100dvh] bg-black flex items-center justify-center text-[#CCFF00] font-black italic uppercase">Loading Portal...</div>}>
      <ParentContent />
    </Suspense>
  );
}