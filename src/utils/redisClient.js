import dotenv from "dotenv";
import Redis from "ioredis"

dotenv.config();

const redis = new Redis(`rediss://default:${process.env.REDIS_KEY}@neat-eagle-11072.upstash.io:6379`);
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

export default redis;