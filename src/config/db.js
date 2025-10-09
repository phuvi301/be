import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'sample_mflix'  // Cách 1: Chỉ định DB khi kết nối
        });
        console.log("MongoDB connected");
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
  return `Hello, ${this.name}!`;
};

// const dbConn = mongoose.connection.useDb("sample_mflix"); ----> Cách 2
const comments = mongoose.model("comments", DBSchema);

export default {connectDB, comments};
