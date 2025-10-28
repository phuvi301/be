import mongoose from "mongoose";
// import Track from "../models/Track.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: "MusicHub",
        });
        console.log("✅ MongoDB connected");
        // const result = await Track.syncIndexes();
        // console.log('Indexes synced:', result);

        // const indexes = await Track.listIndexes();
        // console.log('Current indexes:', indexes);
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

// const dbConn = mongoose.connection.useDb("sample_mflix"); ----> Cách 2
// const comments = mongoose.model("comments", DBSchema);

// export default {connectDB, comments};
export default { connectDB };
