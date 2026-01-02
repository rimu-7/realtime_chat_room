"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useRealtime } from "@/lib/realtime-client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// --- TYPES ---
interface Message {
  id: string
  sender: string
  text: string
  timestamp: Date | string
  token?: string
}

interface MessagesResponse {
  messages: Message[]
}

// --- HELPER ---
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
  const queryClient = useQueryClient()
  
  // --- STATE & REFS ---
  const [input, setInput] = useState("")
  const [copyStatus, setCopyStatus] = useState("COPY ID")
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // --- QUERIES ---
  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } })
      return res.data
    },
  })

  const { data: messagesData } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } })
      return res.data || { messages: [] }
    },
  })

  // --- MUTATIONS ---
  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      return await client.messages.post({ sender: username, text }, { query: { roomId } })
    },
    onMutate: async ({ text }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", roomId] })
      const previousMessages = queryClient.getQueryData<MessagesResponse>(["messages", roomId])

      const optimisticMessage: Message = {
        id: `temp-${Math.random()}`,
        sender: username,
        text: text,
        timestamp: new Date(),
      }

      queryClient.setQueryData<MessagesResponse>(["messages", roomId], (old) => ({
        messages: [...(old?.messages || []), optimisticMessage],
      }))

      setInput("")
      return { previousMessages }
    },
    onError: (err, newTodo, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", roomId], context.previousMessages)
      }
    },
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

  // --- REALTIME ---
  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event, payload }) => {
      if (event === "chat.destroy") {
        router.push("/?destroyed=true")
        return
      }

      if (event === "chat.message") {
        if (payload) {
          const newMessage = payload as Message
          if (newMessage.sender !== username) {
            queryClient.setQueryData<MessagesResponse>(["messages", roomId], (old) => {
              if (!old) return { messages: [newMessage] }
              if (old.messages.some((m) => m.id === newMessage.id)) return old
              return { messages: [...old.messages, newMessage] }
            })
          }
        }
        queryClient.invalidateQueries({ queryKey: ["messages", roomId] })
      }
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
      setTimeRemaining((prev) => (prev === null || prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [timeRemaining, router])

  useEffect(() => {
    if (messagesData?.messages) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      })
    }
  }, [messagesData?.messages.length])

  // --- HANDLERS ---
  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopyStatus("COPIED")
    setTimeout(() => setCopyStatus("COPY ID"), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault()
      sendMessage({ text: input })
    }
  }

  // --- RENDER ---
  return (
    <div className="h-[100dvh] w-screen bg-black text-zinc-300 font-mono flex flex-col overflow-hidden selection:bg-green-900 selection:text-white">
      
      {/* 1. TOP BAR GRID */}
      {/* A grid of 3 columns: Info | Timer | Destroy */}
      <header className="h-14 shrink-0 grid grid-cols-[1fr_auto_auto] border-b border-zinc-800 bg-zinc-950">
        
        {/* COL 1: Room Info */}
        <div className="flex items-center px-4 md:px-6 gap-4 border-r border-zinc-800">
          <div className="w-2 h-2 bg-green-500 animate-pulse" />
          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase text-zinc-500 tracking-widest leading-none mb-1">Session ID</span>
            <div className="flex items-center gap-2">
               <span className="font-bold text-zinc-100 truncate max-w-[100px] md:max-w-xs">{roomId}</span>
               <button onClick={copyLink} className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2 text-zinc-400 hover:text-white transition-colors uppercase">
                 {copyStatus}
               </button>
            </div>
          </div>
        </div>

        {/* COL 2: Timer */}
        <div className="flex items-center px-6 border-r border-zinc-800 min-w-[120px] justify-center bg-zinc-900/20">
          <span className={`text-xl font-bold tracking-widest font-variant-numeric tabular-nums ${
            timeRemaining !== null && timeRemaining < 60 ? "text-red-500 animate-pulse" : "text-amber-500"
          }`}>
            {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
          </span>
        </div>

        {/* COL 3: Destroy Button */}
        <button
          onClick={() => destroyRoom()}
          className="px-6 md:px-8 bg-red-950/20 hover:bg-red-600/90 text-red-500 hover:text-white border-none transition-all duration-200 flex items-center gap-2 group"
        >
          <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Destroy</span>
          <span className="text-lg group-hover:rotate-12 transition-transform">💣</span>
        </button>
      </header>


      {/* 2. MAIN CHAT AREA (Full Screen Flex) */}
      <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-black p-0">
        
        {(!messagesData?.messages || messagesData.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-4">
             <div className="w-16 h-16 border border-zinc-800 flex items-center justify-center">
                <span className="animate-pulse">_</span>
             </div>
             <p className="uppercase tracking-widest text-xs">System Ready. Awaiting Input.</p>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex flex-col min-h-full">
           {messagesData?.messages.map((msg, index) => {
             const isMe = msg.sender === username
             const isLast = index === messagesData.messages.length - 1
             
             return (
               <div key={msg.id} className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
                 {/* Full width row container for each message */}
                 <div className={`
                    max-w-[100%] md:max-w-[80%] 
                    ${isMe ? "border-l border-b border-zinc-900 bg-zinc-900/10" : "border-b border-zinc-800 bg-black"}
                    flex flex-col
                 `}>
                    <div className="p-4 md:p-6 md:pr-12 relative group">
                        
                        {/* Header of the message box */}
                        <div className="flex items-center gap-3 mb-2 opacity-60 text-[10px] uppercase tracking-wider">
                           <span className={isMe ? "text-green-500" : "text-blue-500"}>
                             {isMe ? ">> ORIGIN: YOU" : ">> ORIGIN: ANONYMOUS"}
                           </span>
                           <span className="text-zinc-600">
                             {format(new Date(msg.timestamp), "HH:mm:ss")} // PACKET-{index}
                           </span>
                        </div>

                        {/* Content */}
                        <p className={`text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed ${isMe ? "text-zinc-200" : "text-zinc-400"}`}>
                          {msg.text}
                        </p>
                        
                        {/* Decorative corner for visual flair */}
                        {isMe && <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-transparent border-r-green-900/50" />}
                    </div>
                 </div>
               </div>
             )
           })}
           <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>


      {/* 3. INPUT FOOTER */}
      <footer className="shrink-0 border-t border-zinc-800 bg-black p-0">
        <div className="flex h-16 md:h-20">
          
          {/* Prompt Icon Box */}
          <div className="w-14 md:w-20 border-r border-zinc-800 flex items-center justify-center bg-zinc-900/30">
            <span className="text-green-500 animate-pulse text-xl">›</span>
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={input}
            onKeyDown={handleKeyDown}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ENTER MESSAGE TO TRANSMIT..."
            className="flex-1 bg-transparent px-6 text-sm md:text-base text-white placeholder:text-zinc-700 focus:outline-none focus:bg-zinc-900/10 transition-colors"
          />

          {/* Send Button Box */}
          <button
            onClick={() => sendMessage({ text: input })}
            disabled={!input.trim()}
            className="w-24 md:w-32 border-l border-zinc-800 bg-zinc-950 hover:bg-zinc-100 hover:text-black disabled:opacity-50 disabled:hover:bg-zinc-950 disabled:hover:text-zinc-500 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Send
          </button>
        </div>
        
        {/* Sub-footer status line */}
        <div className="h-6 border-t border-zinc-900 flex items-center justify-between px-2 bg-zinc-950">
             <span className="text-[9px] text-zinc-700 uppercase">Encrypted Connection</span>
             <span className="text-[9px] text-zinc-700 uppercase">STATUS: ONLINE</span>
        </div>
      </footer>
      
    </div>
  )
}

export default Page