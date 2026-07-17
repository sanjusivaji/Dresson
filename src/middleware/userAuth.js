
import User from '../model/userModel.js';
import { COOKIE_KEYS, SESSION_KEYS } from '../constants/cookieConstants.js';

export const requireActiveUser = async (req, res, next) => {
    if (!req.session || !req.session[SESSION_KEYS.USER_SESSION]) {
        return res.redirect('/login');
    }
    try {
        const sessionData = req.session[SESSION_KEYS.USER_SESSION];
        const userId = sessionData.id || sessionData._id || sessionData;
        const user = await User.findById(userId);
        if (!user || user.isBlocked === true || user.status === 'Blocked') {
            delete req.session[SESSION_KEYS.USER_SESSION];
            if (req.session[SESSION_KEYS.ADMIN_SESSION]) {
                return req.session.save((err) => {
                    if (err) console.error("Session save error during block check:", err);
                    return res.render('user/login', { 
                        error: 'Your account has been blocked by the Administrator.',
                        layout: 'layout/auth' 
                    });
                });
            }
            return req.session.destroy((err) => {
                if (err) {
                    console.error("Session destruction error:", err);
                    return res.redirect('/login');
                }
                res.clearCookie(COOKIE_KEYS.SESSION_ID); 
                return res.render('user/login', { 
                    error: 'Your account has been blocked by the Administrator.',
                    layout: 'layout/auth' 
                });
            });
        }
        req.user = user;
        next();

    } catch (error) {
        console.error("Middleware Auth Error:", error);
        res.redirect('/login');
    }
};

