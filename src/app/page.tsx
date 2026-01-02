"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { 
  ShieldAlert, 
  Trash2, 
  Users, 
  Terminal, 
  Loader2, 
  Lock, 
  Fingerprint 
} from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility for clean class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Page = () => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <Lobby />
    </Suspense>
  )
}

export default Page

function Lobby() {
  const { username } = useUsername()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch on the random username
  useEffect(() => {
    setMounted(true)
  }, [])

  const wasDestroyed = searchParams.get("destroyed") === "true"
  const error = searchParams.get("error")

  const { mutate: createRoom, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post()
      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`)
      }
    },
  })

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-zinc-100 selection:bg-green-900 selection:text-green-50">
      
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        
        {/* Header Section */}
        <div className="mb-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl shadow-green-900/10">
            <Terminal className="h-6 w-6 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 font-mono">
            {">"}private_chat<span className="animate-pulse text-green-500">_</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium">
            End-to-end ephemeral communication.
          </p>
        </div>

        {/* Alerts Section */}
        <div className="space-y-4 mb-6">
          {wasDestroyed && (
            <AlertBadge 
              icon={Trash2}
              title="Session Terminated" 
              desc="Room data has been permanently incinerated."
              variant="destructive"
            />
          )}
          {error === "room-not-found" && (
            <AlertBadge 
              icon={ShieldAlert}
              title="Uplink Failed" 
              desc="Target coordinates invalid or expired."
              variant="destructive"
            />
          )}
          {error === "room-full" && (
            <AlertBadge 
              icon={Users}
              title="Capacity Reached" 
              desc="The room cannot accept new connections."
              variant="warning"
            />
          )}
        </div>

        {/* Main Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:border-zinc-700/50 hover:shadow-2xl hover:shadow-green-900/5">
          
          <div className="space-y-6">
            
            {/* Identity Field */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Fingerprint className="h-3.5 w-3.5" />
                Assigned Identity
              </label>

              <div className="relative flex items-center gap-3 overflow-hidden rounded-lg border border-zinc-800 bg-black/50 p-1 pr-4 transition-colors group-hover:border-zinc-700">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 text-xs">ID</span>
                </div>
                <div className="flex-1 font-mono text-sm text-zinc-300 truncate">
                  {mounted ? username : <span className="animate-pulse text-zinc-700">INITIALIZING...</span>}
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => createRoom()}
              disabled={isPending}
              className="relative w-full overflow-hidden rounded-lg bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              <div className="flex items-center justify-center gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>ESTABLISHING SECURE CHANNEL...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>CREATE SECURE ROOM</span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Decorative Corner lines */}
          <div className="pointer-events-none absolute left-0 top-0 h-16 w-16 border-l border-t border-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-16 w-16 border-r border-b border-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-zinc-600 font-mono">
          RSA-4096 ENCRYPTION :: NO LOGS :: SELF-DESTRUCT
        </p>
      </div>
    </main>
  )
}

// Reusable Alert Component for cleanliness
function AlertBadge({ 
  icon: Icon, 
  title, 
  desc, 
  variant = "default" 
}: { 
  icon: any, 
  title: string, 
  desc: string, 
  variant?: "default" | "destructive" | "warning" 
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-lg border p-3 backdrop-blur-sm",
      variant === "destructive" && "border-red-900/50 bg-red-950/20",
      variant === "warning" && "border-amber-900/50 bg-amber-950/20",
      variant === "default" && "border-zinc-800 bg-zinc-900/50"
    )}>
      <Icon className={cn(
        "h-5 w-5 shrink-0 mt-0.5",
        variant === "destructive" && "text-red-500",
        variant === "warning" && "text-amber-500",
        variant === "default" && "text-zinc-500"
      )} />
      <div className="space-y-0.5">
        <p className={cn(
          "text-sm font-bold",
          variant === "destructive" && "text-red-400",
          variant === "warning" && "text-amber-400",
          variant === "default" && "text-zinc-200"
        )}>{title}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
    </div>
  )
}