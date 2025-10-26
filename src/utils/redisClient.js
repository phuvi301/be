import dotenv from "dotenv";
import Redis from "ioredis"

dotenv.config();

const redis = new Redis(`rediss://default:${process.env.REDIS_KEY}@neat-eagle-11072.upstash.io:6379`);
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

export default redis;

// client.on('error', err => console.log('Redis Client Error', err));

// await client.connect();
// console.log("✅ Connected to Redis!");

// await client.set("fuck", "you");
// console.log(await client.get("testKey"));

// await client.set('key', 'value');
// const value = await client.get('key');
// console.log(value); // >>> value

// await client.hSet('user-session:123', {
//     name: 'John',
//     surname: 'Smith',
//     company: 'Redis',
//     age: 29
// })

// let userSession = await client.hGetAll('user-session:123');
// console.log(JSON.stringify(userSession, null, 2));
// /* >>>
// {
//   "surname": "Smith",
//   "name": "John",
//   "company": "Redis",
//   "age": "29"
// }
//  */

// await client.quit();
