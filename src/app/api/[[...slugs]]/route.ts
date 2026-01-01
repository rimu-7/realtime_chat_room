import { redist } from "@/lib/redis";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";

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

const app = new Elysia({ prefix: "/api" }).use(alive).use(rooms);

export const GET = app.fetch;
export const POST = app.fetch;

export type App = typeof app;
