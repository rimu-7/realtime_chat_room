"use client";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useUsername } from "@/hooks/use-username";

export default function RoomId() {
  const [input, setInput] = useState("");
  const [copyStatus, setCopyStatus] = useState("Copy");
  const username = useUsername();
  const { roomId } = useParams() as { roomId: string };

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async (text: string) => {
      await client.messages.post({ sender: username, text }, { query: { roomId } });
    },
    onSuccess: () => setInput(""),
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyStatus("Copied!");
    toast.success("Link copied!");
    setTimeout(() => setCopyStatus("Copy"), 2000);
  };

  return (
    <main className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Room ID</span>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-green-400">{roomId}</span>
            <button onClick={copyLink} className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
              {copyStatus}
            </button>
          </div>
        </div>
        <button className="text-xs bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white px-3 py-2 rounded transition-colors">
          💣 DESTROY NOW
        </button>
      </header>

      {/* Messages Area */}
      <section className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-zinc-600 text-xs font-mono uppercase tracking-widest my-8">
          Secure connection established
        </div>
      </section>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-mono text-xs">{">"}</span>
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-green-900 focus:outline-none text-zinc-100 py-3 pl-8 pr-4 text-sm font-mono"
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="bg-zinc-100 text-black px-6 py-2 text-sm font-bold hover:bg-white transition-colors"
          >
            SEND
          </button>
        </div>
      </div>
    </main>
  );
}