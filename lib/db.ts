import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rescouter?authSource=admin';
const DEBUG = process.env.DEBUG || "false";

const connectDB = async () => {
    try
    {
        const conn = await mongoose.connect(MONGODB_URI);
        if (DEBUG === "true") console.log('Connected to MongoDB:', conn.connection.host);
        return conn;
    }
    catch (err)
    {
        if (DEBUG === "true") console.log('Error connecting to MongoDB:', err);
        throw err;
    }
}

export default connectDB;
