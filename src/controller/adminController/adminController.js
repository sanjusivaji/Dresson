
import * as adminAuthService from '../../services/admin/adminAuthService.js';
import { COOKIE_KEYS } from '../../constants/adminAuthConstants.js';
import logger from '../../utilities/logger.js';

// For 'display' 'login' page
export const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        pageTitle: "Admin Login - Dresson",
        hideNavigation: true
    });
};

// For 'login process'
export const processLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // The service handles bcrypt and throws an error if it fails
        const adminUser = await adminAuthService.verifyAdminCredentials(email, password);
        
        req.session.admin = adminUser._id;
        res.redirect('/admin/dashboard');
    } catch (error) {
        logger.error("Admin authentication system exception:", error.message);
        // Fallback to sending the error string exactly as your previous logic did
        res.send(error.message || "Access Denied: Invalid administrative credentials.");
    }
};

export const loadDashboard = async (req, res) => {
    try {
        const dashboardData = await adminAuthService.getDashboardData();
        
        res.render('admin/dashboard', {
            ...dashboardData,
            pageTitle: "Dashboard - Dresson",
            activePage: 'dashboard'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

// For 'logout'
export const logout = (req, res) => {
    try {
        // Clear auth cookies using your constants
        res.clearCookie(COOKIE_KEYS.TOKEN); 
        res.clearCookie(COOKIE_KEYS.ADMIN_TOKEN);        
        if (req.session) {                   // Clear express-session memories
            req.session.destroy((err) => {
                if (err) {
                    console.error("Session destruction failure during logout routine:", err);
                    return res.status(500).send("Failed to log out cleanly.");
                }
                
                res.clearCookie(COOKIE_KEYS.SESSION_ID); 
                return res.redirect('/admin/login');
            });
        } else {
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.error("Critical failure during logout transaction processing:", error);
        res.status(500).send("Internal Server Error processing logout sequence.");
    }
};

