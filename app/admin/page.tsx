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

    const auth = localStorage.getItem('muv_admin_auth') === 'true';
    setIsAdmin(auth);
    if (auth) fetchData();
  }, [fetchData]);

  const handleAdminLogin = async () => {
    const { data } = await supabase.from('admins').select('*').eq('username', adminUsername).eq('pin', adminPin).single();
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
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2 text-[#CCFF00]">Command</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12">System Authorization Required</p>
        <div className="w-full max-w-xs space-y-4">
          <input placeholder="ADMIN USER" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none uppercase" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} />
          <input type="password" placeholder="PIN" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
          <button onClick={handleAdminLogin} className="bg-[#CCFF00] text-black p-5 rounded-2xl font-black uppercase italic w-full">Unlock Terminal</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 font-sans text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#CCFF00]">Fleet Command</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">on<span className="text-white">the</span>muv master control</p>
        </div>
        <button onClick={() => { setIsAdmin(false); localStorage.removeItem('muv_admin_auth'); }} className="text-[9px] font-black uppercase bg-zinc-900 text-zinc-500 px-4 py-2 rounded-xl border border-zinc-800 hover:text-red-500 transition-colors">Terminate Session</button>
      </div>

      {/* MASTER LIVE MAP */}
      <div className="mb-10 bg-zinc-900 p-2 rounded-[2.5rem] border border-zinc-800 h-[500px] relative overflow-hidden">
        <div className="absolute top-6 left-6 z-[1000] bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-black uppercase italic flex items-center gap-2 border border-[#CCFF00]/30">
          <span className="w-2 h-2 bg-[#CCFF00] rounded-full animate-pulse shadow-[0_0_10px_#CCFF00]" /> Fleet Active: {rides.length}
        </div>
        <MapContainer center={[-26.2041, 28.0473]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '2rem', filter: 'invert(100%) hue-rotate(180deg) brightness(95%)' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {busIcon && rides.map(r => (
            <Marker key={r.id} position={[r.current_lat, r.current_lng]} icon={busIcon}>
              <Popup>
                <div className="p-1 text-black">
                  <p className="font-black italic uppercase">{r.vehicles?.plate_number}</p>
                  <p className="text-[9px] font-bold opacity-50 uppercase">Driver: {r.vehicles?.driver_name}</p>
                  <p className="text-[10px] font-black text-green-600 uppercase mt-1">Status: Active ({r.speed} KM/H)</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* REGISTRATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800">
          <h2 className="text-[10px] font-black uppercase mb-6 text-[#CCFF00] tracking-widest">Add Vehicle</h2>
          <div className="space-y-4">
            <input placeholder="REGISTRATION" className="w-full bg-zinc-900 p-4 rounded-xl font-bold uppercase outline-none border border-zinc-800 focus:border-[#CCFF00]" value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} />
            <input placeholder="DRIVER NAME" className="w-full bg-zinc-900 p-4 rounded-xl font-bold uppercase outline-none border border-zinc-800 focus:border-[#CCFF00]" value={vehicleForm.driver} onChange={e => setVehicleForm({...vehicleForm, driver: e.target.value})} />
            <input placeholder="DRIVER PIN" className="w-full bg-zinc-900 p-4 rounded-xl font-bold outline-none border border-zinc-800 focus:border-[#CCFF00]" value={vehicleForm.pin} onChange={e => setVehicleForm({...vehicleForm, pin: e.target.value})} />
            <button onClick={async () => {
               await supabase.from('vehicles').insert([{ plate_number: vehicleForm.plate.toUpperCase(), driver_name: vehicleForm.driver, pin: vehicleForm.pin }]);
               fetchData(); setVehicleForm({ plate: '', driver: '', pin: '' });
            }} className="w-full bg-white text-black p-4 rounded-xl font-black uppercase italic hover:bg-[#CCFF00] transition-colors">Register Unit</button>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800">
          <h2 className="text-[10px] font-black uppercase mb-6 text-[#CCFF00] tracking-widest">Enroll Student</h2>
          <div className="space-y-4">
            <input placeholder="STUDENT FULL NAME" className="w-full bg-zinc-900 p-4 rounded-xl font-bold uppercase outline-none border border-zinc-800 focus:border-[#CCFF00]" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
            <input placeholder="PARENT PHONE" className="w-full bg-zinc-900 p-4 rounded-xl font-bold outline-none border border-zinc-800 focus:border-[#CCFF00]" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} />
            <select className="w-full bg-zinc-900 p-4 rounded-xl font-bold outline-none border border-zinc-800 focus:border-[#CCFF00] appearance-none" value={studentForm.vehicleId} onChange={e => setStudentForm({...studentForm, vehicleId: e.target.value})}>
              <option value="">ASSIGN TO VEHICLE</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
            </select>
            <button onClick={async () => {
               await supabase.from('students').insert([{ name: studentForm.name, parent_phone: studentForm.phone, vehicle_id: parseInt(studentForm.vehicleId), status: 'Not picked' }]);
               fetchData(); setStudentForm({ name: '', phone: '', vehicleId: '' });
            }} className="w-full bg-[#CCFF00] text-black p-4 rounded-xl font-black uppercase italic shadow-[0_0_15px_rgba(204,255,0,0.1)]">Finalize Enrollment</button>
          </div>
        </div>
      </div>

      {/* MANIFEST */}
      <div className="bg-zinc-900/30 p-8 rounded-[2.5rem] border border-zinc-800">
        <h2 className="text-[10px] font-black uppercase mb-8 text-zinc-500 tracking-[0.3em] text-center">Operational Manifest</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map(s => (
            <div key={s.id} className="p-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/50 hover:border-[#CCFF00]/50 transition-all group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black italic uppercase text-lg leading-none mb-2">{s.name}</p>
                  <p className="text-[9px] font-black text-zinc-500 uppercase">{s.vehicles?.plate_number} • {s.parent_phone}</p>
                </div>
                <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-full ${s.status === 'Boarded' ? 'bg-[#CCFF00] text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                  {s.status}
                </span>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => {
                   const link = `${window.location.origin}/parent?auth=${s.parent_phone}`;
                   navigator.clipboard.writeText(link);
                   alert("Copied to clipboard");
                }} className="flex-1 bg-zinc-800 text-white py-3 rounded-xl text-[9px] font-black uppercase hover:bg-white hover:text-black transition-all">Copy Link</button>
                <button onClick={async () => { 
                  if(confirm(`Remove ${s.name}?`)) {
                    await supabase.from('students').delete().eq('id', s.id); 
                    fetchData(); 
                  }
                }} className="bg-zinc-800 text-red-500 px-4 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Del</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}