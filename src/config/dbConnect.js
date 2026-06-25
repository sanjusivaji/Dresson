import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(` MongoDB Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(` MongoDB Connection Error: ${error.message}`);
        // If the database fails, we force the entire Node app to stop
        process.exit(1); 
    }
};

export default connectDB;