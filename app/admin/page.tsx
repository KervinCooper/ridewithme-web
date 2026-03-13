"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPin, setAdminPin] = useState("");
  
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  
  const [busIcon, setBusIcon] = useState<any>(null);

  const fetchData = useCallback(async () => {
    const { data: st } = await supabase.from('students').select('*, vehicles(plate_number)');
    const { data: vh } = await supabase.from('vehicles').select('*');
    const { data: rd } = await supabase.from('rides').select('*, vehicles(plate_number, driver_name)');
    setStudents(st || []);
    setVehicles(vh || []);
    setRides(rd || []);
  }, []);

  useEffect(() => {
    const initLeaflet = async () => {
      const L = (await import('leaflet')).default;
      setBusIcon(L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      }));
    };
    initLeaflet();

    const auth = typeof window !== 'undefined' && localStorage.getItem('muv_admin_auth') === 'true';
    setIsAdmin(auth);
    if (auth) fetchData();
  }, [fetchData]);

  const handleAdminLogin = async () => {
    const { data, error } = await supabase.from('admins').select('*').eq('username', adminUsername).eq('pin', adminPin).maybeSingle();
    if (data) {
      setIsAdmin(true);
      localStorage.setItem('muv_admin_auth', 'true');
      fetchData();
    } else {
      alert("Unauthorized Access");
    }
  };

  if (isAdmin === null) return <div className="min-h-screen bg-[#050505]" />;

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 bg-[#CCFF00] rounded-2xl mb-6 flex items-center justify-center shadow-lg"><span className="text-black font-black italic text-2xl">M</span></div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-2 text-[#CCFF00] text-center">Command Center</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12 text-center">System Authorisation Required</p>
        <div className="w-full max-w-xs space-y-4">
          <input placeholder="ADMIN USER" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none uppercase text-white" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} />
          <input type="password" placeholder="PIN" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none text-white" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
          <button onClick={handleAdminLogin} className="bg-[#CCFF00] text-black p-5 rounded-2xl font-black uppercase italic w-full active:scale-95 transition-all">Log In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] p-6 font-sans text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-[#CCFF00]">Fleet Command</h1>
          <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Live Overview</p>
        </div>
        <button onClick={() => { setIsAdmin(false); localStorage.removeItem('muv_admin_auth'); }} className="text-[10px] font-black uppercase bg-zinc-950 text-white hover:text-red-500 px-6 py-3 rounded-xl border border-zinc-800 transition-colors">Log Out</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Map */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden h-[400px] lg:h-[600px] relative">
          <MapContainer center={[-26.2, 28.0]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            {/* Premium Dark Tiles */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {rides.map(r => (
              <Marker key={r.vehicle_id} position={[r.current_lat, r.current_lng]} icon={busIcon}>
                <Popup className="custom-popup">
                  <div className="text-center font-black uppercase italic text-black">
                    {r.vehicles?.plate_number} <br/> {r.speed} km/h
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="absolute top-4 left-4 z-[1000] bg-black/80 px-4 py-2 rounded-lg backdrop-blur-sm border border-zinc-700">
             <p className="text-[#CCFF00] font-black text-[10px] uppercase">Active Vehicles: {rides.length}</p>
          </div>
        </div>

        {/* Right Col: Data Lists */}
        <div className="space-y-6 flex flex-col">
          {/* Vehicles Panel */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex-1">
            <h2 className="text-[#CCFF00] text-sm font-black uppercase italic mb-4">Vehicles</h2>
            <div className="space-y-3">
              {vehicles.map(v => (
                <div key={v.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                  <span className="font-bold uppercase text-sm">{v.plate_number}</span>
                  <span className="text-[10px] text-zinc-500 uppercase">{v.driver_name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Students Panel */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex-1">
            <h2 className="text-[#CCFF00] text-sm font-black uppercase italic mb-4">Passenger Manifest</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {students.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                  <div>
                    <p className="font-bold uppercase text-sm">{s.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{s.vehicles?.plate_number}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${s.status === 'Picked Up' ? 'bg-[#CCFF00]/20 text-[#CCFF00]' : 'bg-zinc-800 text-zinc-400'}`}>
                    {s.status || 'Waiting'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}