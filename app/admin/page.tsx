"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamic Map components to prevent SSR errors
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

  // Hold the icon in state so we can load it safely on the client
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
    // 1. SAFELY IMPORT LEAFLET ON THE CLIENT
    const initLeaflet = async () => {
      const L = (await import('leaflet')).default;

      // Fix default marker icons 404
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Create custom bus icon
      setBusIcon(L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854859.png",
        iconSize: [35, 35],
        iconAnchor: [17, 35],
      }));
    };

    initLeaflet();

    // 2. AUTH CHECK
    const auth = localStorage.getItem('bus_admin_auth') === 'true';
    setIsAdmin(auth);

    if (auth) {
      fetchData();
      const channel = supabase.channel('admin-master-sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [fetchData]);

  const handleAdminLogin = async () => {
    const { data } = await supabase.from('admins').select('*').eq('username', adminUsername).eq('pin', adminPin).single();
    if (data) {
      setIsAdmin(true);
      localStorage.setItem('bus_admin_auth', 'true');
      fetchData();
    } else {
      alert("Unauthorized Access");
    }
  };

  if (isAdmin === null) return <div className="min-h-screen bg-[#F8F9FA]" />;

  if (!isAdmin) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8 text-blue-500">Command Center</h1>
        <div className="w-full max-w-xs space-y-4">
          <input placeholder="USERNAME" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-zinc-800 text-center font-bold outline-none" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} />
          <input type="password" placeholder="PIN" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-zinc-800 text-center font-bold outline-none" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
          <button onClick={handleAdminLogin} className="bg-white text-black p-5 rounded-2xl font-black uppercase italic w-full active:scale-95 transition-transform">Unlock Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 font-sans text-black">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Fleet Manager</h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">Real-time Operations</p>
        </div>
        <button onClick={() => { setIsAdmin(false); localStorage.removeItem('bus_admin_auth'); }} className="text-[10px] font-black uppercase bg-red-50 text-red-500 px-4 py-2 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-colors">Logout</button>
      </div>

      {/* MASTER LIVE MAP */}
      <div className="mb-10 bg-white p-4 rounded-[2.5rem] shadow-sm border border-zinc-100 overflow-hidden h-[450px] relative">
        <div className="absolute top-8 left-8 z-[1000] bg-black text-white px-4 py-2 rounded-full text-[10px] font-black uppercase italic flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" /> Live Fleet Radar
        </div>
        <MapContainer center={[-26.2041, 28.0473]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '2rem' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {busIcon && rides.map(r => (
            <Marker key={r.id} position={[r.current_lat, r.current_lng]} icon={busIcon}>
              <Popup>
                <div className="p-2 font-sans">
                  <p className="font-black italic uppercase">{r.vehicles?.plate_number}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Driver: {r.vehicles?.driver_name}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase mt-1">Speed: {r.speed || 0} KM/H</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100">
          <h2 className="text-xs font-black uppercase mb-6 text-blue-600 tracking-widest">Register Bus</h2>
          <div className="space-y-4">
            <input placeholder="PLATE NUMBER" className="w-full bg-zinc-50 p-4 rounded-xl font-bold uppercase outline-none" value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} />
            <input placeholder="DRIVER NAME" className="w-full bg-zinc-50 p-4 rounded-xl font-bold uppercase outline-none" value={vehicleForm.driver} onChange={e => setVehicleForm({...vehicleForm, driver: e.target.value})} />
            <input placeholder="PIN" className="w-full bg-zinc-50 p-4 rounded-xl font-bold outline-none" value={vehicleForm.pin} onChange={e => setVehicleForm({...vehicleForm, pin: e.target.value})} />
            <button onClick={async () => {
               await supabase.from('vehicles').insert([{ plate_number: vehicleForm.plate.toUpperCase(), driver_name: vehicleForm.driver, pin: vehicleForm.pin }]);
               fetchData(); setVehicleForm({ plate: '', driver: '', pin: '' });
            }} className="w-full bg-black text-white p-4 rounded-xl font-black uppercase italic active:scale-95 transition-transform">Add to Fleet</button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100">
          <h2 className="text-xs font-black uppercase mb-6 text-blue-600 tracking-widest">Enroll Student</h2>
          <div className="space-y-4">
            <input placeholder="NAME" className="w-full bg-zinc-50 p-4 rounded-xl font-bold uppercase outline-none" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
            <input placeholder="PHONE" className="w-full bg-zinc-50 p-4 rounded-xl font-bold uppercase outline-none" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} />
            <select className="w-full bg-zinc-50 p-4 rounded-xl font-bold outline-none" value={studentForm.vehicleId} onChange={e => setStudentForm({...studentForm, vehicleId: e.target.value})}>
              <option value="">SELECT BUS</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
            </select>
            <button onClick={async () => {
               await supabase.from('students').insert([{ name: studentForm.name, parent_phone: studentForm.phone, vehicle_id: parseInt(studentForm.vehicleId), status: 'Not picked' }]);
               fetchData(); setStudentForm({ name: '', phone: '', vehicleId: '' });
            }} className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase italic active:scale-95 transition-transform">Enroll Child</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100">
        <h2 className="text-xs font-black uppercase mb-6 text-zinc-400 tracking-widest">Live Manifest Control</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map(s => (
            <div key={s.id} className="p-6 rounded-3xl border border-zinc-50 bg-zinc-50/50 flex justify-between items-center group">
              <div>
                <p className="font-black italic uppercase leading-none">{s.name}</p>
                <div className="flex gap-2 items-center mt-2">
                   <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${s.status === 'Boarded' ? 'bg-blue-100 text-blue-600' : 'bg-zinc-200 text-zinc-500'}`}>
                    {s.status}
                   </span>
                   <span className="text-[9px] font-bold text-zinc-400 uppercase">Bus: {s.vehicles?.plate_number}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                   const link = `${window.location.origin}/parent?auth=${s.parent_phone}`;
                   navigator.clipboard.writeText(link);
                   alert("Parent tracking link copied!");
                }} className="bg-white text-green-600 px-4 py-2 rounded-xl text-[9px] font-black border border-green-100 uppercase hover:bg-green-600 hover:text-white transition-colors">Link</button>
                <button onClick={async () => { 
                  if(confirm(`Delete ${s.name}?`)) {
                    await supabase.from('students').delete().eq('id', s.id); 
                    fetchData(); 
                  }
                }} className="bg-white text-red-400 px-4 py-2 rounded-xl text-[9px] font-black border border-red-50 uppercase hover:bg-red-500 hover:text-white transition-colors">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}