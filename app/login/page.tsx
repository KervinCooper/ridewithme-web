"use client";
import { useState } from "react";
import { supabase } from "@/services/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push("/admin/"); 
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 p-8 shadow-xl border border-zinc-800">
        <h1 className="mb-6 text-center text-4xl font-black italic uppercase text-[#CCFF00] tracking-tighter">ON<span className="text-white">THE</span>MUV</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-5 py-4 text-white outline-none focus:border-[#CCFF00] font-bold"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-5 py-4 text-white outline-none focus:border-[#CCFF00] font-bold"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#CCFF00] py-4 font-black uppercase italic text-black transition-all hover:opacity-90 disabled:opacity-50 text-lg"
          >
            {loading ? "Authenticating..." : "Login to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}