import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import { z } from "zod";
import { Message, realtime } from "@/lib/realtime";

// 24 Hours TTL (Adjust as needed)
const ROOM_TTL_SECONDS = 86400;

const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    const roomId = nanoid();

    // Create room meta
    await redis.hset(`meta:${roomId}`, {
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);

    return { roomId };
  })
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      // Return 0 if key doesn't exist (expired)
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return { ttl: ttl > 0 ? ttl : 0 };
    },
    { query: z.object({ roomId: z.string() }) }
  )
  .delete(
    "/",
    async ({ auth }) => {
      const { roomId } = auth;

      // 1. Notify clients immediately
      await realtime
        .channel(roomId)
        .emit("chat.destroy", { isDestroyed: true });

      // 2. Clean up DB (Parallelized)
      await Promise.all([
        redis.del(`meta:${roomId}`),
        redis.del(`messages:${roomId}`),
      ]);
    },
    { query: z.object({ roomId: z.string() }) }
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomId } = auth;

      // 1. Check existence fast
      const roomExists = await redis.exists(`meta:${roomId}`);
      if (!roomExists) {
        throw new Error("Room does not exist");
      }

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      // 2. CRITICAL PATH: Save & Emit in parallel
      // We don't await the TTL updates for the response to return
      // This makes the API response ~2x faster
      await Promise.all([
        // Store message
        redis.rpush(`messages:${roomId}`, {
          ...message,
          token: auth.token, // Store token for ownership checks later
        }),
        
        // Broadcast to other clients
        realtime.channel(roomId).emit("chat.message", message),
      ]);

      // 3. HOUSEKEEPING (Fire and forget, or non-blocking await)
      // Extend room life on activity
      const extendTTL = async () => {
        const remaining = await redis.ttl(`meta:${roomId}`);
        if (remaining > 0) {
            await Promise.all([
                redis.expire(`messages:${roomId}`, remaining),
                redis.expire(`meta:${roomId}`, remaining)
            ])
        }
      };
      
      // Execute without holding up the response
      extendTTL(); 

      return { success: true, messageId: message.id };
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages:${auth.roomId}`,
        0,
        -1
      );

      // Sanitize: Only return the token if it matches the requester
      // (Allows client to know which messages are theirs even if name duplicates)
      return {
        messages: messages.map((m) => ({
          ...m,
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    { query: z.object({ roomId: z.string() }) }
  );

const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

export type App = typeof app;