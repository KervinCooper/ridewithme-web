"use client";
import { useRouter } from 'next/navigation';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => router.push('/')}
          className="text-[#CCFF00] text-xs font-black uppercase mb-8"
        >
          ← Back to App
        </button>

        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">
          Privacy <span className="text-[#CCFF00]">Policy</span>
        </h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-12">
          Effective Date: March 11, 2026
        </p>

        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold uppercase text-xs mb-2 tracking-widest">1. Location Data</h2>
            <p>
              ONTHEMUV collects precise location data from **Drivers** during active shifts. 
              This data is used solely to provide real-time tracking for authorized Parents and 
              Admins via the Supabase backend.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase text-xs mb-2 tracking-widest">2. Data Storage</h2>
            <p>
              All user data, including phone numbers and vehicle registrations, is stored securely 
              using Supabase encryption. We do not sell or share this data with third-party advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase text-xs mb-2 tracking-widest">3. Compliance</h2>
            <p>
              We comply with the Protection of Personal Information Act (POPIA) for our users in 
              South Africa. Users can request data deletion by contacting the system administrator.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-900 text-center">
          <p className="text-zinc-600 text-[8px] font-black uppercase tracking-widest">
            © 2026 ONTHEMUV TRANSIT SOLUTIONS
          </p>
        </div>
      </div>
    </div>
  );
}