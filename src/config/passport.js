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
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error("Google email not found"), null);
        }
        let user = await User.findOne({ email: email });
        if (user && user.isBlocked) {
            return done(null, false, {
                message: "Your account has been blocked by an administrator."
            });
        }
        if (!user) {
            const givenName = profile.name?.givenName || profile.displayName.split(' ')[0];
            const familyName = profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || '';

            user = new User({
                firstName: givenName,
                lastName: familyName,
                email: email,
                password: Math.random().toString(36).slice(-8) + "Aa1@", // Regex compliant
                isVerified: true,     // Bypass OTP requirement
                googleId: profile.id, // Permanent Google Profile Link
                role: "user",         // Default access level
                isBlocked: false
            });
            await user.save();
        }
        return done(null, user);
        
    } catch (error) {
        console.error(`Google OAuth Error: ${error.message}`);
        return done(error, null);
    }
}));
passport.serializeUser((user, done) => {
    done(null, user.id);
});
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