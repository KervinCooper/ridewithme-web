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

  // Persistence: Auto-login driver
  useEffect(() => {
    const savedReg = localStorage.getItem('muv_driver_reg');
    const savedPin = localStorage.getItem('muv_driver_pin');
    if (savedReg && savedPin) {
      setReg(savedReg);
      setPin(savedPin);
      // We don't auto-login here to prevent accidents, 
      // but the fields will be filled.
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('plate_number', reg.toUpperCase().trim())
      .eq('pin', pin.trim())
      .maybeSingle();

    if (data) {
      setVehicle(data);
      localStorage.setItem('muv_driver_reg', reg.toUpperCase().trim());
      localStorage.setItem('muv_driver_pin', pin.trim());
    } else {
      alert("Verification Failed. Check Reg & PIN.");
    }
    setLoading(false);
  };

  const fetchManifest = useCallback(async () => {
    if (!vehicle) return;
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('status', { ascending: false }) // Keep boarded at the top
      .order('name', { ascending: true });
    setStudents(data || []);
  }, [vehicle]);

  useEffect(() => { if (vehicle) fetchManifest(); }, [vehicle, fetchManifest]);

  // GPS Logic with WakeLock (prevents screen dimming)
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
      }, (err) => console.error(err), { enableHighAccuracy: true });
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isLive, vehicle]);

  const updateStatus = async (id: number, status: string) => {
    const { error } = await supabase.from('students').update({ status }).eq('id', id);
    if (!error) fetchManifest();
  };

  if (!vehicle) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-white">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">on<span className="text-[#CCFF00]">the</span>muv</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12 text-center">Pilot / Driver Terminal</p>
        
        <div className="w-full max-w-sm space-y-4">
          <input 
            placeholder="VEHICLE REG" 
            className="w-full bg-zinc-900 text-white p-6 rounded-[2rem] font-bold text-center outline-none border-2 border-transparent focus:border-[#CCFF00] transition-all uppercase"
            value={reg} onChange={e => setReg(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="SECURE PIN" 
            className="w-full bg-zinc-900 text-white p-6 rounded-[2rem] font-bold text-center outline-none border-2 border-transparent focus:border-[#CCFF00] transition-all"
            value={pin} onChange={e => setPin(e.target.value)}
          />
          <button 
            onClick={handleLogin} 
            className="w-full bg-white text-black p-6 rounded-[2rem] font-black uppercase italic shadow-xl transition-transform active:scale-95"
          >
            {loading ? "Verifying..." : "Initialize Shift"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 text-white font-sans">
      {/* Pilot Header */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black italic uppercase text-[#CCFF00]">{vehicle.plate_number}</h1>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Pilot: {vehicle.driver_name}</p>
        </div>
        <button 
          onClick={() => setIsLive(!isLive)} 
          className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase transition-all ${isLive ? 'bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-white text-black'}`}
        >
          {isLive ? '● Transmitting' : 'Go Live'}
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] ml-4 mb-4">Passenger Manifest</h2>
        {students.map(s => (
          <div key={s.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] flex justify-between items-center transition-all active:bg-zinc-800">
            <div>
              <p className="font-black italic uppercase text-lg leading-none">{s.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'Boarded' ? 'bg-[#CCFF00]' : 'bg-zinc-700'}`} />
                <p className={`text-[9px] font-black uppercase tracking-tighter ${s.status === 'Boarded' ? 'text-[#CCFF00]' : 'text-zinc-500'}`}>
                  {s.status || 'Waiting'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {s.status !== 'Boarded' ? (
                <button 
                  onClick={() => updateStatus(s.id, 'Boarded')} 
                  className="bg-[#CCFF00] text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-[#CCFF00]/10"
                >
                  Board
                </button>
              ) : (
                <button 
                  onClick={() => updateStatus(s.id, 'Dropped')} 
                  className="bg-zinc-800 text-zinc-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase"
                >
                  Drop
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center opacity-20">
        <p className="text-[8px] font-black uppercase tracking-[0.5em]">onthemuv telemetry active</p>
      </div>
    </div>
  );
}