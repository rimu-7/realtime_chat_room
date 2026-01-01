import { Redis } from "@upstash/redis";

export const redist = Redis.fromEnv()