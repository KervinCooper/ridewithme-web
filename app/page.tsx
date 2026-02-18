"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 text-center">
      {/* Brand Header */}
      <div className="relative group">
        <h1 className="text-7xl font-black italic uppercase tracking-tighter leading-none">
          on<span className="text-[#CCFF00]">the</span>muv
        </h1>
        <div className="absolute -top-4 -right-2 bg-[#CCFF00] text-black text-[10px] px-2 py-0.5 font-bold italic rounded-sm transform rotate-12">
          PRO
        </div>
      </div>
      
      <p className="mt-4 text-zinc-500 font-bold uppercase tracking-[0.4em] text-[10px]">
        Smart Transit Systems
      </p>

      {/* Access Portal */}
      <div className="mt-16 w-full max-w-sm space-y-4">
        <Link 
          href="/parent" 
          className="group block w-full bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] transition-all hover:border-[#CCFF00]/50"
        >
          <p className="text-[#CCFF00] text-[10px] font-black uppercase tracking-widest mb-1">Secure Tracking</p>
          <p className="text-2xl font-black italic uppercase group-hover:translate-x-1 transition-transform">Parent Portal</p>
        </Link>

        <Link 
          href="/driver" 
          className="group block w-full bg-zinc-950 border border-zinc-900 p-6 rounded-[2rem] transition-all hover:bg-zinc-900"
        >
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Fleet Access</p>
          <p className="text-2xl font-black italic uppercase opacity-80 group-hover:opacity-100 transition-opacity">Driver Entry</p>
        </Link>
      </div>

      {/* Security Disclaimer */}
      <div className="mt-12 max-w-[280px]">
        <p className="text-zinc-600 text-[11px] leading-relaxed">
          Authorized access only. By entering, you agree to real-time location protocols for student safety.
        </p>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pt-12 flex items-center gap-4 text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
        <span>Privacy</span>
        <div className="w-1 h-1 bg-zinc-800 rounded-full" />
        <span>Terms</span>
        <div className="w-1 h-1 bg-zinc-800 rounded-full" />
        <span className="text-zinc-500 underline underline-offset-4">ZanoSamu Digital Studios</span>
      </div>
    </div>
  );
}