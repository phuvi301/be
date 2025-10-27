import redis from "../utils/redisClient.js";

const addToHistory = async (userID, trackID) => {
    await redis.lrem(`historyOf:${userID}`, 0, trackID);
    await redis.lpush(`historyOf:${userID}`, trackID);
    await redis.ltrim(`historyOf:${userID}`, 0, 14);
    await redis.expire(`historyOf:${userID}`, 7 * 24 * 60 * 60);
};

export const getHistory = async (userID) => {
    return userID ? await redis.lrange(`historyOf:${userID}`, 0, -1) : [];
}

export default addToHistory;
