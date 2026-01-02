import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";
import { nanoid } from "nanoid";

// Define the shape of your Redis data
interface RoomMeta {
  connected: string[] | undefined; // It might be missing!
  createdAt: number;
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/);

  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url));

  const roomId = roomMatch[1];

  // 1. Fetch data
  const meta = await redis.hgetall<RoomMeta>(`meta:${roomId}`);

  if (!meta)
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));

  // 2. SAFE PARSING (The Fix)
  // Ensure 'connected' is always an array, even if Redis returns undefined or null
  const connectedUsers: string[] = Array.isArray(meta.connected) 
    ? meta.connected 
    : []; 

  const existingToken = req.cookies.get("x-auth-token")?.value;

  // 3. Use the safe variable
  if (existingToken && connectedUsers.includes(existingToken)) {
    return NextResponse.next();
  }

  if (connectedUsers.length >= 2) {
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  const response = NextResponse.next();
  const token = nanoid();

  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  // 4. Update Redis with the new list
  await redis.hset(`meta:${roomId}`, {
    connected: [...connectedUsers, token],
  });

  return response;
}

export const config = {
  matcher: "/room/:path*",
};