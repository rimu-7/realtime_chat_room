"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useRealtime } from "@/lib/realtime-client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// Define Message Interface for Type Safety
interface Message {
  id: string
  sender: string
  text: string
  timestamp: Date | string
}

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const Page = () => {
  const params = useParams()
  const roomId = params.roomId as string
  const router = useRouter()
  const { username } = useUsername()
  const queryClient = useQueryClient() // Required for Optimistic Updates
  
  // UI State
  const [input, setInput] = useState("")
  const [copyStatus, setCopyStatus] = useState("COPY LINK")
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // --- DATA FETCHING ---
  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } })
      return res.data
    },
  })

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } })
      return res.data
    },
  })

  // --- MUTATIONS (OPTIMISTIC UPDATE) ---
  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      return await client.messages.post({ sender: username, text }, { query: { roomId } })
    },
    // 1. Run this BEFORE the request goes out
    onMutate: async ({ text }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["messages", roomId] })

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(["messages", roomId])

      // Create a fake message
      const optimisticMessage: Message = {
        id: Math.random().toString(), // Temporary ID
        sender: username,
        text: text,
        timestamp: new Date(),
      }

      // Optimistically update the cache
      queryClient.setQueryData(["messages", roomId], (old: any) => {
        return {
          ...old,
          messages: [...(old?.messages || []), optimisticMessage],
        }
      })

      // Clear input immediately for "instant" feel
      setInput("")

      // Return context with the previous messages (for rollback)
      return { previousMessages }
    },
    // 2. If the server throws an error, roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(["messages", roomId], context?.previousMessages)
    },
    // 3. Always refetch after error or success to ensure we have the real server ID/timestamp
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", roomId] })
      inputRef.current?.focus()
    },
  })

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } })
    },
  })

  // --- EFFECTS ---

  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl)
  }, [ttlData])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return
    if (timeRemaining === 0) {
      router.push("/?destroyed=true")
      return
    }
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeRemaining, router])

  // Scroll to bottom on updates
  useEffect(() => {
    if (messages?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages]) // This now triggers immediately on 'sendMessage' due to optimistic update

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") refetch()
      if (event === "chat.destroy") router.push("/?destroyed=true")
    },
  })

  // --- HANDLERS ---
  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopyStatus("COPIED")
    setTimeout(() => setCopyStatus("COPY LINK"), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      sendMessage({ text: input })
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 md:p-6 font-mono selection:bg-green-900 selection:text-green-100">
      <div className="w-full max-w-3xl flex flex-col h-[85vh] md:h-[800px] border border-zinc-800 bg-black shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* HEADER */}
        <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/50 p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Secure Room</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-zinc-200 text-sm md:text-base">
                  {roomId.slice(0, 8)}...
                </span>
                <button
                  onClick={copyLink}
                  className="text-[10px] border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 px-2 py-0.5 text-zinc-400 hover:text-zinc-200 transition-all uppercase tracking-wider"
                >
                  {copyStatus}
                </button>
              </div>
            </div>

            <div className="hidden md:block h-8 w-px bg-zinc-800" />

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Auto-Purge</span>
              <span
                className={`text-sm font-bold font-variant-numeric tabular-nums tracking-wide ${
                  timeRemaining !== null && timeRemaining < 60
                    ? "text-red-500 animate-pulse"
                    : "text-amber-500"
                }`}
              >
                {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
              </span>
            </div>
          </div>

          <button
            onClick={() => destroyRoom()}
            className="group relative overflow-hidden bg-red-950 hover:bg-red-600 border border-red-900/50 hover:border-red-500 transition-all duration-300 px-4 py-2"
          >
            <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-red-200 group-hover:text-white uppercase tracking-widest">
              <span>💣</span>
              <span>Terminate</span>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[linear-gradient(45deg,transparent_25%,#000_25%,#000_50%,transparent_50%,transparent_75%,#000_75%,#000_100%)] bg-[length:10px_10px] transition-opacity" />
          </button>
        </header>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {messages?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-2">
              <div className="w-2 h-2 bg-green-500 animate-ping" />
              <p className="text-zinc-600 text-xs uppercase tracking-widest">
                Secure Channel Established
              </p>
            </div>
          )}

          {messages?.messages.map((msg: Message) => {
            const isMe = msg.sender === username
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] md:max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  
                  <div className={`flex items-baseline gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isMe ? "text-green-500" : "text-blue-500"
                      }`}
                    >
                      {isMe ? "YOU" : "ANON"}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {format(new Date(msg.timestamp), "HH:mm")}
                    </span>
                  </div>

                  <div 
                    className={`
                      relative p-3 md:p-4 text-sm md:text-base border
                      ${isMe 
                        ? "bg-zinc-900/50 border-green-900/30 text-zinc-100" 
                        : "bg-black border-zinc-800 text-zinc-300"
                      }
                    `}
                  >
                    <div className={`absolute top-0 w-2 h-2 border-t border-l ${isMe ? "right-0 border-green-500/50 rotate-90" : "left-0 border-blue-500/50"}`} />
                    
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="shrink-0 p-4 bg-black border-t border-zinc-800">
          <div className="flex items-stretch gap-0 border border-zinc-700 focus-within:border-green-500/50 transition-colors bg-zinc-900/20">
            
            <div className="w-10 flex items-center justify-center border-r border-zinc-800 bg-zinc-900/50">
              <span className="text-green-500 animate-pulse text-lg">›</span>
            </div>

            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={input}
              onKeyDown={handleKeyDown}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter encrypted message..."
              className="flex-1 bg-transparent px-4 py-3 md:py-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />

            <button
              onClick={() => sendMessage({ text: input })}
              disabled={!input.trim()} // Removed isPending so button stays active
              className="px-6 md:px-8 text-xs font-bold bg-zinc-900 hover:bg-zinc-100 text-zinc-400 hover:text-black transition-all border-l border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              SEND
            </button>
          </div>
          
          <div className="mt-2 flex justify-between items-center px-1">
             <span className="text-[9px] text-zinc-700 uppercase">End-to-end encrypted</span>
             <span className="text-[9px] text-zinc-700">v1.0.0-rc</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Page