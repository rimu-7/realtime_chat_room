import { InferRealtimeEvents, Realtime } from "@upstash/realtime";
import z from "zod";
import { redist } from "@/lib/redis";

const message = z.object({
  id: z.string(),
  sender: z.string(),
  text: z.string(),
  timeStamp: z.number,
  roomId: z.string(),
  token: z.string().optional(),
});
const schema = {
  chat: {
    message,
    destroy: z.object({
      isDestroyed: z.literal(true),
    }),
  },
};

export const realtime = new Realtime({
  schema,
  redist,
});

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
export type Message = z.infer<typeof message>;
