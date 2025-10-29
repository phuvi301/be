import redis from "../utils/redisClient.js";

const addToHistory = async (userID, trackID) => {
    await redis.lrem(`historyOf:${userID}`, 0, trackID);
    await redis.lpush(`historyOf:${userID}`, trackID);
    await redis.ltrim(`historyOf:${userID}`, 0, 14);
    await redis.expire(`historyOf:${userID}`, 7 * 24 * 60 * 60);
};

const addToCurrent = async (userID, trackID, playbackTime, playlistID = null, index = null) => {
    try {
        await redis.hmset(`currentOf:${userID}`, {
            trackID: trackID,
            playbackTime: playbackTime,
            playlistID: playlistID,
            index: index
        });
        await redis.expire(`currentOf:${userID}`, 3 * 24 * 60 * 60);
    } catch(err) {
        console.error("Error saving playback state to Redis:", err);
    }

}

export const getHistory = async (userID) => {
    return userID ? await redis.lrange(`historyOf:${userID}`, 0, -1) : [];
}

const getPlaybackState = async (userID) => {
    try {
        const progress = await redis.hgetall(`currentOf:${userID}`);
        return progress;
    } catch (error) {
        console.error("Error getting playback state from Redis:", error);
        return null;
    }
};

const updatePlaybackTime = async (userID, playbackTime) => {
    try {
        await redis.hmset(
            `currentOf:${userID}`,
            'playbackTime', playbackTime
        );
    } catch (error) {
        console.error("Error updating playback time:", error);
    }
};

export default {addToHistory, addToCurrent, getPlaybackState, updatePlaybackTime};
