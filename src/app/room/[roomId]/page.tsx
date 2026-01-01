"use client";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

export default function RoomId() {
  const [copyStatus, setCopyStatus] = useState("Copy");
  const params = useParams();
  const roomId = params.roomId as string;

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);

    toast.success("Link copied to clipboard!");
    setCopyStatus("Copied!");

    // Fix: Correct setTimeout syntax
    setTimeout(() => {
      setCopyStatus("Copy");
    }, 2000);
  };

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
              room id
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-green-400">
                {roomId}
              </span>
              <button
                onClick={copyLink}
                className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-all active:scale-95"
              >
                {copyStatus}
              </button>
            </div>
          </div>
        </div>

        {/* Placeholder for "Unlimited People" counter */}
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-green-500">1,240 online</span>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center p-8">
        {/* Your cute animals will go here! */}
        <p className="text-zinc-600 font-mono animate-bounce">
          Waiting for animals to join...
        </p>
      </section>
    </main>
  );
}
