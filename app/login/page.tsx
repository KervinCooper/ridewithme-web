"use client";
import { useState } from "react";
import { supabase } from "@/services/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Direct query to your custom admins table
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username.toUpperCase().trim())
        .eq('pin', pin.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Success: Set the flag that the Admin Page looks for
        localStorage.setItem('muv_admin_auth', 'true');
        router.push("/admin"); 
      } else {
        alert("Invalid Admin Credentials. Please check your Username and PIN.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("System Error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-sm rounded-[2.5rem] bg-zinc-900 p-8 shadow-xl border border-zinc-800">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black italic uppercase text-[#CCFF00] tracking-tighter">
            ON<span className="text-white">THE</span>MUV
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-2">Admin Terminal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-5 py-4 text-white outline-none focus:border-[#CCFF00] font-bold uppercase"
            required
          />
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-5 py-4 text-white outline-none focus:border-[#CCFF00] font-bold"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#CCFF00] py-5 font-black uppercase italic text-black transition-all hover:opacity-90 disabled:opacity-50 text-lg shadow-lg"
          >
            {loading ? "AUTHENTICATING..." : "LOGIN TO ADMIN"}
          </button>
        </form>
      </div>
    </div>
  );
}