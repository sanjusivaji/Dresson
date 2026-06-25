import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../model/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback", 
    
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. Safely extract the email
        const email = profile.emails?.[0]?.value;

        if (!email) {
            return done(new Error("Google email not found"), null);
        }

        // 2. Find existing user
        let user = await User.findOne({ email: email });

        // 3. Security Check: Is the user explicitly blocked by an admin?
        if (user && user.isBlocked) {
            return done(null, false, {
                message: "Your account has been blocked by an administrator."
            });
        }

        // 4. SIGN UP: Create new user if they do not exist
        if (!user) {
            // Safely split the name to satisfy your database schema requirements
            const givenName = profile.name?.givenName || profile.displayName.split(' ')[0];
            const familyName = profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || '';

            user = new User({
                firstName: givenName,
                lastName: familyName,
                email: email,
                password: Math.random().toString(36).slice(-8) + "Aa1@", // Regex compliant
                isVerified: true, // Bypass OTP requirement
                googleId: profile.id, // Permanent Google Profile Link
                role: "user", // Default access level
                isBlocked: false
            });

            await user.save();
        }

        // 5. LOGIN: Success! Send the user through.
        return done(null, user);
        
    } catch (error) {
        console.error(`Google OAuth Error: ${error.message}`);
        return done(error, null);
    }
}));

// Memory Optimization: Save only the user's database ID to the session, not the whole object
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize: Fetch the user data from MongoDB using the ID when a new page loads
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error(`Deserialize User Error: ${error.message}`);
        done(error, null);
    }
});

export default passport;