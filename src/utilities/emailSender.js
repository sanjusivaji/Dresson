import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from './logger.js';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS  
    }
});

const sendOtpEmail = async (email, otp, purpose = 'signup') => {
    try {
        const subjectLine = purpose === 'reset' ? 'Dresson - Password Reset Code' : 'Dresson - Your Verification Code';
        const headerText = purpose === 'reset' ? 'Password Reset Request' : 'Welcome to Dresson!';
        const bodyText = purpose === 'reset' ? 'Your OTP to securely reset your password is:' : 'Your OTP for account verification is:';

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subjectLine,
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>${headerText}</h2>
                    <p>${bodyText}</p>
                    <h1 style="color: #208b59; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire in 5 minutes.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        logger.info(`OTP sent to ${email} for ${purpose}`);
    } catch (error) {
        logger.error("Error sending email:", error);
    }
};

export default sendOtpEmail;