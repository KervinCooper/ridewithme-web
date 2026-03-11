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
  
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', vehicleId: '' });
  const [vehicleForm, setVehicleForm] = useState({ plate: '', driver: '', pin: '' });
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

    // In Capacitor, we check localStorage directly
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
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2 text-[#CCFF00]">Fleet Management</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12">System Authorisation Required</p>
        <div className="w-full max-w-xs space-y-4">
          <input placeholder="ADMIN USER" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none uppercase text-white" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} />
          <input type="password" placeholder="PIN" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none text-white" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
          <button onClick={handleAdminLogin} className="bg-[#CCFF00] text-black p-5 rounded-2xl font-black uppercase italic w-full active:scale-95 transition-all">Log In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 font-sans text-white">
      {/* Rest of your Admin UI code remains the same */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#CCFF00]">Fleet Management</h1>
        <button onClick={() => { setIsAdmin(false); localStorage.removeItem('muv_admin_auth'); }} className="text-[9px] font-black uppercase bg-zinc-900 text-zinc-500 px-4 py-2 rounded-xl border border-zinc-800">Log Out</button>
      </div>
      {/* ... (Admin Dashboard Content) ... */}
      <p className="text-center text-zinc-600 text-[10px] uppercase">Admin Session Active</p>
    </div>
  );
}