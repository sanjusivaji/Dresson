// Navigate up two levels to src, then into services/constants
import * as adminAuthService from '../../services/admin/adminAuthService.js';
import { COOKIE_KEYS } from '../../constants/adminAuthConstants.js';

// For 'display' 'login' page
const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        pageTitle: "Admin Login - Dresson",
        hideNavigation: true
    });
};

// For 'login process'
const processLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // The service handles bcrypt and throws an error if it fails
        const adminUser = await adminAuthService.verifyAdminCredentials(email, password);
        
        req.session.admin = adminUser._id;
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error("Admin authentication system exception:", error.message);
        // Fallback to sending the error string exactly as your previous logic did
        res.send(error.message || "Access Denied: Invalid administrative credentials.");
    }
};

const loadDashboard = async (req, res) => {
    try {
        // Fetch dashboard metrics from the service
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
const logout = (req, res) => {
    try {
        // Clear auth cookies using your constants
        res.clearCookie(COOKIE_KEYS.TOKEN); 
        res.clearCookie(COOKIE_KEYS.ADMIN_TOKEN);

        // Clear express-session memories
        if (req.session) {
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

export default { loadLogin, processLogin, loadDashboard, logout };