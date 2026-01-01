import { Realtime } from "@upstash/realtime";

export const realtime = new Realtime({
  redisRestUrl: process.env.UPSTASH_REDIS_REST_URL!,
  redisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type Message = {
  id: string;
  sender: string;
  text: string;
  timeStamp: number;
  roomId: string;
};

export type RealtimeEvents = {
  "chat.message": Message;
};