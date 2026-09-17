// This code is for handle  'google authentication'
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../model/userModel.js';
import dotenv from 'dotenv';                                                                                     // For configeration of '.env' files credentials

dotenv.config();
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",     
},
async (accessToken, refreshToken, profile, done) => {                                                            // We should keep 'accessToken', 'refreshToken' because it is 'syntax' and 'profile' contains all data about 'user' ie 'email', 'name', 'displayName'/ 'firstName' and 'familyName' or 'second name' etc) are passed automatically and came from 'Google' and 'done' is the 'callback' function calls only after 'process' finished.
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
            const prefix = givenName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
            const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
            const generatedReferralCode = `${prefix}${randomStr}`;
            user = new User({                                                                                         // Create a new 'user' document in 'Users' collection and then it 'save' below.
                firstName: givenName,
                lastName: familyName,
                email: email,
                password: Math.random().toString(36).slice(-8) + "Aa1@",                                              // Here it creates 'password' and '.toString(36)' converts that decimal into a 'Base36'(ie a 'decimal' number convert like '"0.q8wj2zpq") string and '.slice(-8)' extracts only the last 8 characters of that string and the 'string' ended with "Aa1@"(ie 'uppercase', lowercase', 'number', 'character') ensure passing the 'strict password validation'.
                isVerified: true,    
                googleId: profile.id, 
                role: "user",       
                isBlocked: false,
                referralCode: generatedReferralCode
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