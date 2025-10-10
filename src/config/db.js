import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            ssl: true,
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
  return `Hello, ${this.name}!, your email is ${this.email}. You commented on movie ID: ${this.movie_id} at ${this.date}. Comment: ${this.text}`;
};

// const dbConn = mongoose.connection.useDb("sample_mflix"); // ----> Cách 2
export const comments = mongoose.model("comments", DBSchema);

export default connectDB;
