"use client";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [username, setUserName] = useState("john");
  const router = useRouter()
  const ANIMALS = [
    "Axolotl",
    "Red Panda",
    "Capybara",
    "Quokka",
    "Fennec Fox",
    "Sea Otter",
    "Chinchilla",
    "Hedgehog",
    "Seal Pup",
    "Alpaca",
    "Sugar Glider",
    "Bunny",
    "Pomeranian",
    "Koala",
    "Duckling",
    "Fawn",
  ];

  const STRONG_KEY = "chat_username";
  const generateUserName = () => {
    const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    return `anonymous-${word}-${nanoid(10)}`;
  };

  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STRONG_KEY);
      if (stored) {
        setUserName(stored);
        return;
      }
      const generated = generateUserName();
      localStorage.setItem(STRONG_KEY, generated);
      setUserName(generated);
    };
    main();
  }, []);

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post();

      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`)
      }
    },
  });
  return (
    <main className="flex min-h-screen justify-center items-center p-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="w-full tracking-tight text-center">
          <h1 className="text-green-500 font-bold ">pricate_chat</h1>
          <p className="text-zinc-500 text-sm ">
            a private, self-destructing chat room
          </p>
        </div>
        <div className="border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center text-zinc-500">
                Your Identity
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                  {username}
                </div>
              </div>
            </div>
            <button
              onClick={() => createRoom()}
              className="w-full bg-zinc-100  text-black p-3 text0sm hover:bg-zinc-50  transition-colors cursor-pointer disabled:opacity-50"
            >
              CREATE SECURE ROOM
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
