"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';

export default function DriverPage() {
  const [vehicle, setVehicle] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [reg, setReg] = useState("");
  const [pin, setPin] = useState("");
  const [isLive, setIsLive] = useState(false);

  const handleLogin = async () => {
    const { data } = await supabase.from('vehicles').select('*').eq('plate_number', reg.toUpperCase().trim()).eq('pin', pin.trim()).maybeSingle();
    if (data) setVehicle(data);
    else alert("Login Failed");
  };

  const fetchManifest = useCallback(async () => {
    if (!vehicle) return;
    const { data } = await supabase.from('students').select('*').eq('vehicle_id', vehicle.id).order('name', { ascending: true });
    setStudents(data || []);
  }, [vehicle]);

  useEffect(() => { if (vehicle) fetchManifest(); }, [vehicle, fetchManifest]);

  // GPS Logic
  useEffect(() => {
    let watchId: number;
    if (isLive && vehicle) {
      watchId = navigator.geolocation.watchPosition(async (pos) => {
        await supabase.from('rides').upsert({
          vehicle_id: vehicle.id,
          current_lat: pos.coords.latitude,
          current_lng: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          updated_at: new Date().toISOString()
        }, { onConflict: 'vehicle_id' });
      }, null, { enableHighAccuracy: true });
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isLive, vehicle]);

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('students').update({ status }).eq('id', id);
    fetchManifest(); // Local refresh
  };

  if (!vehicle) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-8 text-white">
        <h1 className="text-4xl font-black italic uppercase mb-8 tracking-tighter">Driver Mode</h1>
        <div className="w-full max-w-xs space-y-4">
          <input placeholder="REGISTRATION" className="w-full bg-zinc-900 p-5 rounded-2xl font-bold uppercase border-2 border-zinc-800" value={reg} onChange={e => setReg(e.target.value)} />
          <input type="password" placeholder="PIN" className="w-full bg-zinc-900 p-5 rounded-2xl font-bold border-2 border-zinc-800 text-center" value={pin} onChange={e => setPin(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 p-5 rounded-2xl font-black uppercase italic">Start Shift</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 font-sans text-black">
      <div className="flex justify-between items-center mb-8 bg-zinc-50 p-6 rounded-[2.5rem]">
        <h1 className="text-2xl font-black italic uppercase italic">{vehicle.plate_number}</h1>
        <button onClick={() => setIsLive(!isLive)} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase ${isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-black text-white'}`}>
          {isLive ? '● Live' : 'Go Live'}
        </button>
      </div>

      <div className="space-y-4">
        {students.map(s => (
          <div key={s.id} className="p-6 border-2 border-zinc-50 rounded-[2.5rem] flex justify-between items-center">
            <div>
              <p className="font-black italic uppercase text-lg">{s.name}</p>
              <p className={`text-[9px] font-black uppercase ${s.status === 'Boarded' ? 'text-blue-600' : 'text-zinc-300'}`}>{s.status}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateStatus(s.id, 'Boarded')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase">Board</button>
              <button onClick={() => updateStatus(s.id, 'Dropped')} className="bg-zinc-100 text-black px-4 py-2 rounded-xl font-black text-[9px] uppercase">Drop</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}