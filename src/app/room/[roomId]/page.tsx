"use client";
import { useParams } from "next/navigation";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RoomId() {
  const [copyStatus, setCopyStatus] = useState("Copy");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
              <div className="h-8 w-px bg-zinc-800" />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 uppercase">
                  Selft-Destruct
                </span>
                <span
                  className={`text-sm font-bold flex items-center gap-2 ${
                    timeRemaining !== null && timeRemaining <= 60
                      ? "text-red-500"
                      : "text-amber-500"
                  }`}
                >
                  {timeRemaining !== null
                    ? formatTimeRemaining(timeRemaining)
                    : "--:--"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs bg-zinc-800 hover:bg-red-500 text-zinc-400 group hover:text-zinc-50 px-3 py-1.5 rounded items-center gap-2">
            <span className="group-hover:animate-pulse">💣</span> DESTROY NOW
          </div>
        </div>

        {/* Placeholder for "Unlimited People" counter */}
        {/* <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-green-500">1,240 online</span>
        </div> */}
      </header>

      <section className="flex-1 flex overflow-y-auto p-4 space-y-4 scrollbar-thin"></section>
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 ">
        <div className="flex gap-4 ">
          <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
              {">"}
            </span>
            <input
              autoFocus
              type="text"
              placeholder="Type a Message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  // todo: send message
                  inputRef.current?.focus()
                }
              }}
              
              className="w-full border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 px-8 pl-8 pr-4 text-sm"
            />
          </div>
          <button className="bg-zinc-800 text-zinc-400 px-6 py-2 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            SEND
          </button>
        </div>
      </div>
    </main>
  );
}
