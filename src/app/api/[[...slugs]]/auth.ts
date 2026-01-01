import { redist } from "@/lib/redis";
import Elysia from "elysia";

export const authMiddleware = new Elysia({ name: "auth" })
  .derive({ as: "scoped" }, async ({ query, cookie: { ["x-auth-token"]: token } }) => {
    const roomId = query.roomId;

    if (!roomId) throw new Error("Missing roomId");

    // For a simple anonymous chat, if no token exists, we generate one
    // In a real app, you'd handle join logic separately
    const userToken = token.value || "anonymous"; 

    return {
      auth: {
        roomId,
        token: userToken,
      }
    };
  });