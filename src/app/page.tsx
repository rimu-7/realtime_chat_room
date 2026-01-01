"use client";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUsername } from "@/hooks/use-username";

export default function Home() {
  const router = useRouter();
  const username = useUsername();

  const { mutate: createRoom, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post();
      if (res.status === 200 && res.data) {
        router.push(`/room/${res.data.roomId}`);
      }
    },
  });

  return (
    <main className="flex min-h-screen justify-center items-center p-4 bg-zinc-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-green-500 font-bold text-2xl tracking-tighter">PRIVATE_CHAT</h1>
          <p className="text-zinc-500 text-sm">a private, self-destructing chat room</p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md rounded-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Your Identity</label>
              <div className="p-3 bg-zinc-950 border border-zinc-800 text-green-500 font-mono text-sm truncate">
                {username || "Generating..."}
              </div>
            </div>
            
            <button
              onClick={() => createRoom()}
              disabled={isPending || !username}
              className="w-full bg-zinc-100 text-black py-3 font-bold text-sm hover:bg-white transition-all disabled:opacity-50"
            >
              {isPending ? "SECURING..." : "CREATE SECURE ROOM"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}