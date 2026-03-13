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

  const [isOffline, setIsOffline] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [toast, setToast] = useState("");
  const [isDayMode, setIsDayMode] = useState(false); 

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const savedReg = localStorage.getItem('muv_driver_reg');
    const savedPin = localStorage.getItem('muv_driver_pin');
    const savedTheme = localStorage.getItem('muv_theme');
    
    if (savedReg && savedPin) { setReg(savedReg); setPin(savedPin); }
    if (savedTheme === 'day') setIsDayMode(true);

    return () => { 
      window.removeEventListener('online', handleOnline); 
      window.removeEventListener('offline', handleOffline); 
    };
  }, []);

  const toggleTheme = () => {
    const newMode = !isDayMode;
    setIsDayMode(newMode);
    localStorage.setItem('muv_theme', newMode ? 'day' : 'night');
  };

  const handleLogin = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) { setShowiOSGuide(true); return; }
    if (deferredPrompt) { deferredPrompt.prompt(); setDeferredPrompt(null); }

    setLoading(true);
    const { data } = await supabase.from('vehicles').select('*').eq('plate_number', reg.toUpperCase().trim()).eq('pin', pin.trim()).maybeSingle();
    if (data) {
      setVehicle(data);
      setSosActive(data.status === 'SOS');
      localStorage.setItem('muv_driver_reg', reg.toUpperCase().trim());
      localStorage.setItem('muv_driver_pin', pin.trim());
    } else { 
      alert("Login Failed. Check Registration and PIN."); 
    }
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

  const toggleSOS = async () => {
    const newStatus = sosActive ? 'ACTIVE' : 'SOS';
    await supabase.from('vehicles').update({ status: newStatus }).eq('id', vehicle.id);
    setSosActive(!sosActive);
  };

  const updateStatus = async (id: number, status: string, studentName: string) => {
    const { error } = await supabase.from('students').update({ status }).eq('id', id);
    if (!error) {
      fetchManifest();
      if (status === 'Dropped') {
        setToast(`Auto-SMS dispatched to ${studentName}'s parent.`);
        setTimeout(() => setToast(""), 4000);
      } else if (status === 'Arriving in 5 mins') {
        setToast(`5 Min Warning sent to ${studentName}'s parent.`);
        setTimeout(() => setToast(""), 4000);
      }
    }
  };

  // Bulk reset for the next morning
  const resetManifest = async () => {
    if (!confirm("Are you starting a new shift? This will reset all passengers to 'WAITING'.")) return;
    
    const { error } = await supabase
      .from('students')
      .update({ status: 'WAITING FOR PICKUP' })
      .eq('vehicle_id', vehicle.id);

    if (!error) {
      fetchManifest();
      setToast("Route reset for new shift.");
      setTimeout(() => setToast(""), 4000);
    } else {
      alert("Failed to reset route: " + error.message);
    }
  };

  // Dynamic Tailwind Classes based on Day/Night Mode
  const pageBg = isDayMode ? "bg-zinc-100 text-black" : "bg-[#050505] text-white";
  const cardBg = isDayMode ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-900 border-zinc-700";
  const inputBg = isDayMode ? "bg-white border-zinc-300 text-black placeholder-zinc-400" : "bg-zinc-900 border-transparent text-white";
  const textMuted = isDayMode ? "text-zinc-500" : "text-zinc-400";
  const highlightText = isDayMode ? "text-green-700" : "text-[#CCFF00]";
  const dropBtnBg = isDayMode ? "bg-black text-white border-black" : "bg-zinc-800 text-white border-zinc-700";
  const warningBtnBg = isDayMode ? "bg-yellow-100 text-yellow-800 border-yellow-300" : "bg-yellow-900/40 text-yellow-500 border-yellow-700/50";

  if (!vehicle) {
    return (
      <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 relative transition-colors duration-300 ${pageBg}`}>
        <button onClick={toggleTheme} className={`absolute top-6 right-6 px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-colors ${isDayMode ? 'border-zinc-300 bg-white text-black' : 'border-zinc-800 bg-zinc-900 text-white'}`}>
          {isDayMode ? '☀ Day' : '☾ Night'}
        </button>
        <div className="mb-10 text-center mt-8">
            <div className="w-20 h-20 bg-[#CCFF00] rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(204,255,0,0.3)]">
              <span className="text-black text-4xl font-black italic">M</span>
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">on<span className={highlightText}>the</span>muv</h1>
            <p className={`text-[9px] font-black uppercase tracking-[0.4em] mt-3 ${textMuted}`}>Driver Terminal</p>
        </div>
        <div className="w-full max-w-sm space-y-4">
          <input placeholder="VEHICLE REG" className={`w-full p-6 rounded-[2rem] font-bold text-center outline-none border-2 focus:border-[#CCFF00] uppercase transition-colors ${inputBg}`} value={reg} onChange={e => setReg(e.target.value)} />
          <input type="password" placeholder="PIN" className={`w-full p-6 rounded-[2rem] font-bold text-center outline-none border-2 focus:border-[#CCFF00] transition-colors ${inputBg}`} value={pin} onChange={e => setPin(e.target.value)} />
          <button onClick={handleLogin} className={`w-full p-6 rounded-[2.2rem] font-black uppercase italic active:scale-95 transition-all text-lg ${isDayMode ? 'bg-black text-[#CCFF00]' : 'bg-white text-black'}`}>
            {loading ? "Logging in..." : "Start Shift"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] p-4 pb-24 relative overflow-hidden transition-colors duration-300 ${pageBg}`}>
      {isOffline && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-[10px] font-black uppercase text-center py-2 z-50">
          No Network Signal - Saving Data Locally
        </div>
      )}

      {toast && (
        <div className="fixed top-4 left-4 right-4 bg-[#CCFF00] text-black p-4 rounded-2xl font-black uppercase text-center shadow-2xl z-50 animate-bounce">
          ✓ {toast}
        </div>
      )}

      <div className="flex justify-end mt-2 mb-2">
        <button onClick={toggleTheme} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border shadow-sm transition-colors ${isDayMode ? 'border-zinc-300 bg-white text-black' : 'border-zinc-800 bg-zinc-900 text-white'}`}>
          {isDayMode ? '☀ Day Mode' : '☾ Night Mode'}
        </button>
      </div>

      <div className={`flex flex-col items-center justify-center mb-6 p-8 rounded-[2rem] border-2 transition-colors ${sosActive ? 'bg-red-950 border-red-600 text-white' : isLive ? (isDayMode ? 'bg-white border-black' : 'bg-zinc-900 border-[#CCFF00]') : cardBg}`}>
        <h1 className="text-5xl font-black italic uppercase text-center mb-2">{vehicle.plate_number}</h1>
        <p className={`text-base font-bold uppercase tracking-widest mb-6 ${sosActive ? 'text-red-200' : textMuted}`}>{vehicle.driver_name}</p>
        
        <div className="flex gap-2 w-full">
          <button onClick={() => setIsLive(!isLive)} className={`flex-1 py-6 rounded-2xl font-black text-xl uppercase tracking-wider shadow-xl transition-all ${isLive ? (isDayMode ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-white') : 'bg-[#CCFF00] text-black'}`}>
            {isLive ? 'END SHIFT' : 'GO LIVE'}
          </button>
          <button onClick={toggleSOS} className={`flex-1 py-6 rounded-2xl font-black text-xl uppercase tracking-wider shadow-xl transition-all ${sosActive ? 'bg-red-600 text-white animate-pulse' : 'bg-red-100 text-red-600 border border-red-300'}`}>
            {sosActive ? 'SOS ACTIVE' : 'SOS / DELAY'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* Bulk Reset Button */}
        <button 
          onClick={resetManifest} 
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform border mb-4 ${isDayMode ? 'bg-zinc-200 border-zinc-300 text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}
        >
          🔄 START NEW SHIFT (RESET ROUTE)
        </button>

        {students.map(s => (
          <div key={s.id} className={`p-6 border rounded-[2rem] flex flex-col gap-4 transition-colors ${cardBg}`}>
            <div>
              <p className="font-black italic uppercase text-3xl leading-none">{s.name}</p>
              <p className={`text-sm font-black uppercase mt-2 ${s.status === 'Picked Up' ? highlightText : s.status === 'Arriving in 5 mins' ? 'text-yellow-500 animate-pulse' : textMuted}`}>
                {s.status || 'WAITING FOR PICKUP'}
              </p>
            </div>
            
            <div className="w-full flex flex-col gap-2 mt-2">
              {/* If they are not picked up or dropped, show the action buttons */}
              {s.status !== 'Picked Up' && s.status !== 'Dropped' && (
                <>
                  {s.status !== 'Arriving in 5 mins' && (
                    <button onClick={() => updateStatus(s.id, 'Arriving in 5 mins', s.name)} className={`w-full py-4 rounded-2xl font-black text-sm uppercase active:scale-95 transition-transform border ${warningBtnBg}`}>
                      🔔 Send 5 Min Warning
                    </button>
                  )}
                  <button onClick={() => updateStatus(s.id, 'Picked Up', s.name)} className="w-full bg-[#CCFF00] text-black py-6 rounded-2xl font-black text-xl uppercase active:scale-95 transition-transform shadow-md mt-2">
                    PICK UP PASSENGER
                  </button>
                </>
              )}
              
              {/* If Picked Up, show Drop Off */}
              {s.status === 'Picked Up' && (
                <button onClick={() => updateStatus(s.id, 'Dropped', s.name)} className={`w-full py-6 rounded-2xl font-black text-xl uppercase active:scale-95 transition-transform border ${dropBtnBg}`}>
                  DROP OFF
                </button>
              )}

              {/* Individual Reset just in case they accidentally dropped off the wrong kid */}
              {s.status === 'Dropped' && (
                <button onClick={() => updateStatus(s.id, 'WAITING FOR PICKUP', s.name)} className="w-full py-4 rounded-2xl font-black text-xs uppercase active:scale-95 transition-transform border border-zinc-700 text-zinc-500 bg-transparent hover:border-[#CCFF00] hover:text-[#CCFF00]">
                  ↺ UNDO DROP OFF
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}