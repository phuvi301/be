import "dotenv/config";
import Redis from "ioredis"


const redis = new Redis(`rediss://default:${process.env.REDIS_KEY}@trusting-javelin-85767.upstash.io:6379`);
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

export default redis;