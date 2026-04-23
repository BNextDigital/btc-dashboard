"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      router.push("/");
    } else {
      setError(true);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
      <div className="border border-[#22231F] bg-[#131315] p-8 w-80 flex flex-col gap-4">
        <h1 className="text-[#E8E4D9] font-mono text-sm tracking-widest uppercase">BTC Decision Desk</h1>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="bg-[#0E0E10] border border-[#22231F] px-3 py-2 text-[#E8E4D9] text-sm font-mono focus:outline-none focus:border-[#D9A84D]"
        />
        {error && <p className="text-[#C4614A] text-xs font-mono tracking-widest uppercase">Incorrect password</p>}
        <button
          onClick={handleSubmit}
          className="border border-[#D9A84D] text-[#D9A84D] text-xs font-mono tracking-widest uppercase py-2 hover:bg-[#D9A84D]/10 transition-colors"
        >
          Enter
        </button>
      </div>
    </main>
  );
}
