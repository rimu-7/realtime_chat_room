import { redist } from "@/lib/redis";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import { z } from "zod";
import { Message, realtime } from "@/lib/realtime";

// Fix: Wrap the return object in a function
const alive = new Elysia({ prefix: "/" }).get("/user", () => ({
  user: { name: "john" },
}));

const ROOM_TTL_SECONDS = 60 * 10;

const rooms = new Elysia({ prefix: "/room" }).post("/create", async () => {
  console.log("Creating new room...");
  const roomId = nanoid();

  // Store room metadata
  // Note: Upstash handles JSON/Objects automatically in hset
  await redist.hset(`meta:${roomId}`, {
    connected: [],
    createdAt: Date.now(),
  });

  // Set expiration so Redis stays clean
  await redist.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);

  return { roomId };
});

const messages = new Elysia({ prefix: "/messages" }).use(authMiddleware).post(
  "/",
  async ({ body, auth }) => {
    const { sender, text } = body;
    const { roomId } = auth;
    const existingRoom = await redist.exists(`meta:${roomId}`);

    if (!existingRoom) {
      throw new Error("Room does not exist");
    }

    const message: Message = {
      id: nanoid(),
      sender,
      text,
      timeStamp: Date.now(),
      roomId,
    };

    //add messages to our history
    await redist.rpush(`messages:${roomId}`, { ...message, token: auth.token });
    await realtime.channel(roomId).emit("chat.message", message);

    //housekeeping

    const remaining = await redist.ttl(`meta:${roomId}`);
    await redist.expire(`messages:${roomId}`, remaining);
    await redist.expire(`history:${roomId}`, remaining);
    await redist.expire(roomId, remaining);
  },

  {
    query: z.object({ roomId: z.string() }),
    body: z.object({
      sender: z.string().max(100),
      text: z.string().max(1000),
    }),
  }
);

const app = new Elysia({ prefix: "/api" }).use(alive).use(rooms);

export const GET = app.fetch;
export const POST = app.fetch;

export type App = typeof app;
