import { redist } from "@/lib/redis";
import { Elysia, t } from "elysia"; 
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import { realtime } from "@/lib/realtime";

const ROOM_TTL_SECONDS = 60 * 60; 

const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    const roomId = nanoid(12);
    await redist.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });
    await redist.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);
    return { roomId };
  });

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post("/", async ({ body, auth }) => {
    const { sender, text } = body;
    const { roomId } = auth;

    const message = {
      id: nanoid(),
      sender,
      text,
      timeStamp: Date.now(),
      roomId,
    };

    // Store message & Emit to Upstash Realtime
    await redist.rpush(`messages:${roomId}`, message);
    await realtime.channel(roomId).emit("chat.message", message);

    // Refresh TTL
    await redist.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);
    await redist.expire(`messages:${roomId}`, ROOM_TTL_SECONDS);

    return { success: true };
  }, {
    body: t.Object({
      sender: t.String(),
      text: t.String()
    }),
    query: t.Object({
      roomId: t.String()
    })
  });

// IMPORTANT: Connect everything here
const app = new Elysia({ prefix: "/api" })
  .use(rooms)
  .use(messages);

export const GET = app.fetch;
export const POST = app.fetch;

export type App = typeof app;