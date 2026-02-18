export default function Home() {
  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center p-12 text-center">
      <div className="space-y-2">
        <h1 className="text-8xl font-black italic uppercase tracking-tighter text-black">BUS-IT</h1>
        <p className="text-blue-600 font-bold uppercase tracking-[0.3em] text-xs">Association Transport Systems</p>
      </div>
      
      <div className="mt-20 p-8 border-2 border-zinc-50 rounded-[3rem] max-w-md">
        <p className="text-zinc-400 text-sm font-medium">
          Access to this platform is restricted to authorized association members, drivers, and registered parents. 
          Please use the link provided by your administrator.
        </p>
      </div>

      <div className="mt-auto flex gap-8 text-[10px] font-black text-zinc-300 uppercase">
        <span>Privacy Policy</span>
        <span>Driver Terms</span>
        <span>Association Hub</span>
      </div>
    </div>
  );
}