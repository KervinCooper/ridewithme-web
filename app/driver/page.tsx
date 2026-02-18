"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';

export default function DriverPage() {
  const [vehicle, setVehicle] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [reg, setReg] = useState("");
  const [pin, setPin] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showiOSGuide, setShowiOSGuide] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const savedReg = localStorage.getItem('muv_driver_reg');
    const savedPin = localStorage.getItem('muv_driver_pin');
    if (savedReg && savedPin) { setReg(savedReg); setPin(savedPin); }
  }, []);

  const handleLogin = async () => {
    // Check PWA before proceeding
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) { setShowiOSGuide(true); return; }
    if (deferredPrompt) { deferredPrompt.prompt(); setDeferredPrompt(null); }

    setLoading(true);
    const { data } = await supabase.from('vehicles').select('*').eq('plate_number', reg.toUpperCase().trim()).eq('pin', pin.trim()).maybeSingle();
    if (data) {
      setVehicle(data);
      localStorage.setItem('muv_driver_reg', reg.toUpperCase().trim());
      localStorage.setItem('muv_driver_pin', pin.trim());
    } else { alert("Login Failed."); }
    setLoading(false);
  };

  const fetchManifest = useCallback(async () => {
    if (!vehicle) return;
    const { data } = await supabase.from('students').select('*').eq('vehicle_id', vehicle.id).order('status', { ascending: false }).order('name', { ascending: true });
    setStudents(data || []);
  }, [vehicle]);

  useEffect(() => { if (vehicle) fetchManifest(); }, [vehicle, fetchManifest]);

  useEffect(() => {
    let watchId: number;
    if (isLive && vehicle) {
      watchId = navigator.geolocation.watchPosition(async (pos) => {
        await supabase.from('rides').upsert({
          vehicle_id: vehicle.id, current_lat: pos.coords.latitude, current_lng: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0, updated_at: new Date().toISOString()
        }, { onConflict: 'vehicle_id' });
      }, null, { enableHighAccuracy: true });
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isLive, vehicle]);

  const updateStatus = async (id: number, status: string) => {
    const { error } = await supabase.from('students').update({ status }).eq('id', id);
    if (!error) fetchManifest();
  };

  if (!vehicle) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-white relative">
        <div className="mb-10 text-center">
            <div className="w-20 h-20 bg-[#CCFF00] rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(204,255,0,0.3)]"><span className="text-black text-4xl font-black italic">M</span></div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">on<span className="text-[#CCFF00]">the</span>muv</h1>
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.4em] mt-3">Driver Terminal</p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <input placeholder="VEHICLE REG" className="w-full bg-zinc-900 p-6 rounded-[2rem] font-bold text-center outline-none border-2 border-transparent focus:border-[#CCFF00] uppercase" value={reg} onChange={e => setReg(e.target.value)} />
          <input type="password" placeholder="PIN" className="w-full bg-zinc-900 p-6 rounded-[2rem] font-bold text-center outline-none border-2 border-transparent focus:border-[#CCFF00]" value={pin} onChange={e => setPin(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-white text-black p-6 rounded-[2.2rem] font-black uppercase italic active:scale-95 transition-all">{loading ? "Logging in..." : "Start Shift"}</button>
        </div>
        {showiOSGuide && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center">
            <h2 className="text-[#CCFF00] text-xl font-black italic uppercase mb-4 text-center">Install Terminal</h2>
            <p className="text-zinc-400 text-sm mb-8">Drivers must add this to the Home Screen to keep GPS active. Tap <span className="text-white">Share</span> then <span className="text-white">"Add to Home Screen"</span>.</p>
            <button onClick={() => setShowiOSGuide(false)} className="bg-white text-black px-10 py-4 rounded-xl font-black uppercase italic text-xs">Got it</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 text-white">
      <div className="flex justify-between items-center mb-8 bg-zinc-900/40 border border-zinc-800 p-5 rounded-[2.2rem]">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#CCFF00] rounded-xl flex items-center justify-center text-black font-black italic">M</div>
            <div>
                <h1 className="text-lg font-black italic uppercase leading-none">{vehicle.plate_number}</h1>
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{vehicle.driver_name}</p>
            </div>
        </div>
        <button onClick={() => setIsLive(!isLive)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase ${isLive ? 'bg-red-600 animate-pulse' : 'bg-white text-black'}`}>
          {isLive ? '● Live' : 'Go Live'}
        </button>
      </div>
      <div className="space-y-3">
        {students.map(s => (
          <div key={s.id} className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-[2.2rem] flex justify-between items-center">
            <div>
              <p className="font-black italic uppercase text-base leading-none">{s.name}</p>
              <p className={`text-[8px] font-black uppercase mt-2 ${s.status === 'Picked Up' ? 'text-[#CCFF00]' : 'text-zinc-600'}`}>{s.status || 'Waiting'}</p>
            </div>
            <div className="flex gap-2">
              {s.status !== 'Picked Up' ? (
                <button onClick={() => updateStatus(s.id, 'Picked Up')} className="bg-[#CCFF00] text-black px-5 py-3 rounded-2xl font-black text-[9px] uppercase active:scale-90">Pick Up</button>
              ) : (
                <button onClick={() => updateStatus(s.id, 'Dropped')} className="bg-zinc-800 text-zinc-500 px-5 py-3 rounded-2xl font-black text-[9px] uppercase active:scale-90">Drop</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}