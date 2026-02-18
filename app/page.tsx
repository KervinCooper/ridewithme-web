"use client";
import { useEffect, useState } from 'react';
import Link from "next/link";

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showiOSGuide, setShowiOSGuide] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleEntry = async (path: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setShowiOSGuide(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      window.location.href = path;
    } else {
      window.location.href = path;
    }
  };

  return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-2">
        <h1 className="text-7xl font-black italic uppercase tracking-tighter">
          on<span className="text-[#CCFF00]">the</span>muv
        </h1>
        <span className="absolute -top-4 -right-4 bg-white text-black text-[8px] px-2 py-1 font-black rounded-full italic">LIVE</span>
      </div>
      <p className="text-zinc-500 font-bold uppercase tracking-[0.4em] text-[10px] mb-16">Smart Transit Systems</p>

      <div className="w-full max-w-sm space-y-4">
        <button onClick={() => handleEntry('/parent')} className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] text-left hover:border-[#CCFF00]/40 transition-all">
          <p className="text-[#CCFF00] text-[10px] font-black uppercase tracking-widest mb-1 font-sans">Parent Secure Access</p>
          <p className="text-2xl font-black italic uppercase">Parent Portal</p>
        </button>

        <button onClick={() => handleEntry('/driver')} className="w-full bg-zinc-950 border border-zinc-900 p-6 rounded-[2.5rem] text-left opacity-80">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1 font-sans">Driver Secure Access</p>
          <p className="text-2xl font-black italic uppercase">Driver Portal</p>
        </button>
      </div>

      {showiOSGuide && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[5000] flex flex-col items-center justify-center p-10">
          <div className="max-w-xs text-center">
            <h2 className="text-[#CCFF00] text-2xl font-black italic uppercase mb-4">Install App</h2>
            <p className="text-zinc-400 text-sm mb-8">Tap the <span className="text-white font-bold">Share Button</span> then <span className="text-white font-bold">"Add to Home Screen"</span> to enable live tracking.</p>
            <button onClick={() => setShowiOSGuide(false)} className="bg-white text-black w-full py-4 rounded-2xl font-black uppercase italic text-xs">I understand</button>
          </div>
        </div>
      )}
    </div>
  );
}