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
      // Use router.push with the trailing slash if you enabled it in next.config.js
      router.push("/admin/"); 
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-8 shadow-xl border border-zinc-800">
        <h1 className="mb-6 text-center text-3xl font-black italic uppercase text-[#CCFF00]">ONTHEMUV</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white outline-none focus:border-[#CCFF00]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white outline-none focus:border-[#CCFF00]"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#CCFF00] py-4 font-black uppercase italic text-black transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Login to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}