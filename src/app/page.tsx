"use client";
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  const navigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-[100dvh] bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-x-hidden">
      
      {/* Admin Top Button */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => navigate('/login')}
          className="text-[10px] font-black uppercase bg-zinc-900 text-zinc-500 px-4 py-2 rounded-xl border border-zinc-800 hover:text-[#CCFF00] transition-colors"
        >
          Admin Portal
        </button>
      </div>

      {/* Brand Header */}
      <div className="relative mb-2 mt-12">
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white">
          on<span className="text-[#CCFF00]">the</span>muv
        </h1>
        <span className="absolute -top-4 -right-4 bg-white text-black text-[8px] px-2 py-1 font-black rounded-full italic">LIVE</span>
      </div>
      <p className="text-zinc-500 font-bold uppercase tracking-[0.4em] text-[8px] md:text-[10px] mb-12">Smart Transit Systems</p>

      {/* Selection Grid */}
      <div className="w-full max-w-sm space-y-4">
        <button 
          onClick={() => navigate('/parent')} 
          className="w-full bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] text-left hover:border-[#CCFF00]/40 transition-all active:scale-95 group"
        >
          <p className="text-[#CCFF00] text-[10px] font-black uppercase tracking-widest mb-1">Secure Tracking</p>
          <p className="text-2xl md:text-3xl font-black italic uppercase text-white group-hover:translate-x-2 transition-transform">Parent Portal</p>
        </button>

        <button 
          onClick={() => navigate('/driver')} 
          className="w-full bg-zinc-950 border border-zinc-900 p-8 rounded-[2.5rem] text-left hover:border-[#CCFF00]/40 transition-all active:scale-95 group"
        >
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Terminal Login</p>
          <p className="text-2xl md:text-3xl font-black italic uppercase text-white group-hover:translate-x-2 transition-transform">Driver Portal</p>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-12 md:mt-16">
        <p className="text-zinc-600 text-[8px] font-black uppercase tracking-widest">© 2026 ONTHEMUV TRANSIT SOLUTIONS</p>
      </div>
    </div>
  );
}