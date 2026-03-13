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
  
  // Data States
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [busIcon, setBusIcon] = useState<any>(null);

  // Form States - Vehicles
  const [vPlate, setVPlate] = useState("");
  const [vDriver, setVDriver] = useState("");
  const [vPin, setVPin] = useState("");

  // Form States - Students
  const [sName, setSName] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sVehicleId, setSVehicleId] = useState("");

  const fetchData = useCallback(async () => {
    const { data: st } = await supabase.from('students').select('*, vehicles(plate_number, status)').order('id', { ascending: false });
    const { data: vh } = await supabase.from('vehicles').select('*').order('id', { ascending: false });
    const { data: rd } = await supabase.from('rides').select('*, vehicles(plate_number, driver_name, status)');
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
    
    // Check local storage for auth (set by your new /login page)
    const auth = typeof window !== 'undefined' && localStorage.getItem('muv_admin_auth') === 'true';
    setIsAdmin(auth);
    if (auth) fetchData();
  }, [fetchData]);

  const handleAdminLogin = async () => {
    const { data } = await supabase.from('admins').select('*').eq('username', adminUsername.toUpperCase().trim()).eq('pin', adminPin).maybeSingle();
    if (data) {
      setIsAdmin(true);
      localStorage.setItem('muv_admin_auth', 'true');
      fetchData();
    } else {
      alert("Unauthorized Access");
    }
  };

  // --- CRUD OPERATIONS ---

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPlate || !vDriver || !vPin) return alert("Please fill all vehicle fields.");
    const { error } = await supabase.from('vehicles').insert([{ plate_number: vPlate.toUpperCase(), driver_name: vDriver, pin: vPin, status: 'ACTIVE' }]);
    if (error) {
      alert("Error adding vehicle: " + error.message);
    } else {
      setVPlate(""); setVDriver(""); setVPin("");
      fetchData();
    }
  };

  const deleteVehicle = async (id: number) => {
    if (!confirm("Are you sure you want to delete this vehicle? This will affect linked learners.")) return;
    await supabase.from('vehicles').delete().eq('id', id);
    fetchData();
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName || !sPhone || !sVehicleId) return alert("Please fill all learner fields and select a vehicle.");
    const { error } = await supabase.from('students').insert([{ name: sName, parent_phone: sPhone, vehicle_id: sVehicleId, status: 'WAITING FOR PICKUP' }]);
    if (error) {
      alert("Error adding learner: " + error.message);
    } else {
      setSName(""); setSPhone(""); setSVehicleId("");
      fetchData();
    }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm("Are you sure you want to remove this learner?")) return;
    await supabase.from('students').delete().eq('id', id);
    fetchData();
  };

  // --- RENDER LOGIC ---

  if (isAdmin === null) return <div className="min-h-screen bg-[#050505]" />;

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-8 text-[#CCFF00]">Admin Login</h1>
        <div className="w-full max-w-xs space-y-4">
          <input placeholder="USERNAME" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none uppercase" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} />
          <input type="password" placeholder="PIN" className="bg-zinc-900 p-5 rounded-2xl w-full border-2 border-transparent focus:border-[#CCFF00] text-center font-bold outline-none" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
          <button onClick={handleAdminLogin} className="bg-[#CCFF00] text-black p-5 rounded-2xl font-black uppercase italic w-full active:scale-95 transition-all">Access Fleet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] p-6 text-white font-sans pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-[#CCFF00]">Fleet Command</h1>
          <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Live Overview</p>
        </div>
        <button onClick={() => { setIsAdmin(false); localStorage.removeItem('muv_admin_auth'); }} className="text-[10px] font-black uppercase bg-zinc-950 text-white hover:text-red-500 px-6 py-3 rounded-xl border border-zinc-800 transition-colors">Log Out</button>
      </div>

      {/* TOP SECTION: Map & Live Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left Col: Map */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden h-[400px] lg:h-[500px] relative">
          <MapContainer center={[-26.2, 28.0]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
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
             <p className="text-[#CCFF00] font-black text-[10px] uppercase">Active Vehicles on map: {rides.length}</p>
          </div>
        </div>

        {/* Right Col: Live Alerts & Manifest */}
        <div className="space-y-6 flex flex-col">
          {/* Vehicles & Alerts Panel */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex-1">
            <h2 className="text-[#CCFF00] text-sm font-black uppercase italic mb-4">Live Alerts</h2>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
              {vehicles.map(v => {
                const activeRide = rides.find(r => r.vehicle_id === v.id);
                const isSpeeding = activeRide && activeRide.speed > 80;

                return (
                <div key={v.id} className={`flex justify-between items-center p-4 rounded-xl border ${v.status === 'SOS' ? 'bg-red-950 border-red-600 animate-pulse' : isSpeeding ? 'bg-orange-950 border-orange-600' : 'bg-zinc-950 border-zinc-800/50'}`}>
                  <div>
                    <span className={`font-bold uppercase text-sm ${v.status === 'SOS' ? 'text-white' : ''}`}>{v.plate_number}</span>
                    <span className={`block text-[10px] uppercase ${v.status === 'SOS' ? 'text-red-300' : 'text-zinc-500'}`}>{v.driver_name}</span>
                  </div>
                  <div className="text-right">
                    {v.status === 'SOS' && <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded">SOS Triggered</span>}
                    {isSpeeding && v.status !== 'SOS' && <span className="bg-orange-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded">Speed ({activeRide.speed}km/h)</span>}
                    {v.status !== 'SOS' && !isSpeeding && <span className="text-[#CCFF00] text-[9px] font-black uppercase">Clear</span>}
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Students Panel */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex-1">
            <h2 className="text-[#CCFF00] text-sm font-black uppercase italic mb-4">Live Route</h2>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
              {students.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                  <div>
                    <p className="font-bold uppercase text-sm">{s.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{s.vehicles?.plate_number}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${s.status === 'Picked Up' ? 'bg-[#CCFF00] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                    {s.status || 'Waiting'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: CRUD Database Management */}
      <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-6 border-b border-zinc-800 pb-4">Database Management</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Manage Vehicles */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-[2rem]">
          <h3 className="text-[#CCFF00] font-black uppercase italic mb-6">Add New Vehicle</h3>
          <form onSubmit={addVehicle} className="space-y-4 mb-8">
            <input type="text" placeholder="Plate Number (e.g. NDZ 123 GP)" required className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 focus:border-[#CCFF00] outline-none text-sm font-bold uppercase" value={vPlate} onChange={(e) => setVPlate(e.target.value)} />
            <input type="text" placeholder="Driver Name" required className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 focus:border-[#CCFF00] outline-none text-sm font-bold capitalize" value={vDriver} onChange={(e) => setVDriver(e.target.value)} />
            <input type="text" placeholder="Terminal Login PIN (e.g. 1234)" required className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 focus:border-[#CCFF00] outline-none text-sm font-bold" value={vPin} onChange={(e) => setVPin(e.target.value)} />
            <button type="submit" className="w-full bg-[#CCFF00] text-black p-4 rounded-xl font-black uppercase italic hover:bg-white transition-colors">Register Vehicle</button>
          </form>

          <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-4">Registered Vehicles</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {vehicles.map(v => (
              <div key={v.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                <div>
                  <p className="font-bold uppercase text-sm">{v.plate_number}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{v.driver_name} | PIN: {v.pin}</p>
                </div>
                <button onClick={() => deleteVehicle(v.id)} className="text-[10px] font-black uppercase bg-red-950/30 text-red-500 border border-red-900/50 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* Manage Learners */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-[2rem]">
          <h3 className="text-[#CCFF00] font-black uppercase italic mb-6">Add New Learner</h3>
          <form onSubmit={addStudent} className="space-y-4 mb-8">
            <input type="text" placeholder="Learner Full Name" required className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 focus:border-[#CCFF00] outline-none text-sm font-bold capitalize" value={sName} onChange={(e) => setSName(e.target.value)} />
            <input type="tel" placeholder="Parent Phone (e.g. 0821234567)" required className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 focus:border-[#CCFF00] outline-none text-sm font-bold" value={sPhone} onChange={(e) => setSPhone(e.target.value)} />
            <select required className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 focus:border-[#CCFF00] outline-none text-sm font-bold text-zinc-400 uppercase" value={sVehicleId} onChange={(e) => setSVehicleId(e.target.value)}>
              <option value="" disabled>Select Assigned Vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate_number} - {v.driver_name}</option>
              ))}
            </select>
            <button type="submit" className="w-full bg-[#CCFF00] text-black p-4 rounded-xl font-black uppercase italic hover:bg-white transition-colors">Register Learner</button>
          </form>

          <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-4">Registered Learners</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {students.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                <div>
                  <p className="font-bold uppercase text-sm">{s.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{s.parent_phone} • {s.vehicles?.plate_number}</p>
                </div>
                <button onClick={() => deleteStudent(s.id)} className="text-[10px] font-black uppercase bg-red-950/30 text-red-500 border border-red-900/50 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">Remove</button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}