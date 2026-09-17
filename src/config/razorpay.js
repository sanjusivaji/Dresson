import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
    console.error("CRITICAL ERROR: Razorpay environment variables are missing!");
    console.error("Please check your .env file for RAZORPAY_KEY_ID and RAZORPAY_SECRET.");
    process.exit(1); 
}

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET 
});

export default razorpayInstance;