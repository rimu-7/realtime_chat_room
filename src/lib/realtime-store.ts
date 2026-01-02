import { createRealtime } from "@upstash/realtime/client";

export type RealtimeEvents = {
  "chat.message": {
    id: string;
    sender: string;
    text: string;
    timeStamp: number;
    roomId: string;
    isOptimistic?: boolean;
  };
};

// 1. Create them together so they share the same Context
export const { RealtimeProvider, useRealtime } = createRealtime<RealtimeEvents>({
  url: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL!,
  token: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN!,
});