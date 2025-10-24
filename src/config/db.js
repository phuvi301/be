import mongoose from "mongoose";
// import Track from "../models/Track.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'MusicHub'
        });
        console.log("MongoDB connected");
        // const result = await Track.syncIndexes();
        // console.log('Indexes synced:', result);

        // const indexes = await Track.listIndexes();
        // console.log('Current indexes:', indexes);
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

const DBSchema = new mongoose.Schema({
    _id: mongoose.Schema.ObjectId,
    name: String,
    email: String,
    movie_id: mongoose.Schema.ObjectId,
    text: String,
    date: Date
});

DBSchema.methods.greet = function () {
  return `Hello, ${this.name}!, your email is ${this.email}. You commented on movie ID: ${this.movie_id} at ${this.date}. Comment: ${this.text}`;
};

// const dbConn = mongoose.connection.useDb("sample_mflix"); ----> Cách 2
const comments = mongoose.model("comments", DBSchema);

export default {connectDB, comments};
