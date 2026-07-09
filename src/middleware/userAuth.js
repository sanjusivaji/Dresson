import User from '../model/userModel.js';

export const requireActiveUser = async (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    try {
        const user = await User.findById(req.session.user);

        if (!user || user.isBlocked === true || user.status === 'Blocked') {
            req.session.destroy((err) => {
                if (err) console.error("Session destruction error:", err);
                res.clearCookie('connect.sid'); 
                return res.render('user/login', { 
                    error: 'Your account has been blocked by the Administrator.',
                    layout: auth 
                });
            });
            return; 
        }
        next();

    } catch (error) {
        console.error("Middleware Auth Error:", error);
        res.redirect('/login');
    }
};