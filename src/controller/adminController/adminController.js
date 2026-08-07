
import * as adminAuthService from '../../services/admin/adminAuthService.js';
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
        const adminUser = await adminAuthService.verifyAdminCredentials(email, password);
                req.session.admin = adminUser._id;
        res.redirect('/admin/dashboard');
    } catch (error) {
        logger.error("Admin authentication system exception:", error.message);
        res.send(error.message || "Access Denied: Invalid administrative credentials.");
    }
};

// For 'display' 'dashboard'
export const loadDashboard = async (req, res) => {
    try {
        const dashboardData = await adminAuthService.getDashboardData();        
        res.render('admin/dashboard', {
            ...dashboardData,
            pageTitle: "Dashboard - Dresson",
            activePage: 'dashboard'                                                  // For 'display' violet color in 'sidebar'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

// For 'logout'
export const logout = (req, res) => {
    if (req.session.admin) {
        delete req.session.admin; 
    }
    if (req.session.user) {                                                         // This is 'logout' session for 'admin' but 'session' is common for 'admin' and 'user' and 'save' is 'session built-in' method('not' mongoose method here)and used for save it 'temporarly'.
        return req.session.save((err) => {                                          //  Here passing 'error' ass parameter because it is a 'error handling' code and here we apply 'error first callback' rule.
            if (err) {
                console.error("Session Save Error during Admin Logout:", err);
                return res.status(500).send("Failed to log out cleanly.");
            }
            res.redirect('/admin/login');
        });
    }
    req.session.destroy((err) => {
        if (err) {
            console.error("Session Destruction Error:", err);
            return res.status(500).send("Failed to log out cleanly.");
        }
        res.clearCookie('connect.sid');                                             // Here 'clearCookie()' is th built-in 'cookie' method and it used for 'delete' cookies of 'browser' ie express sends a special HTTP header back to the user's browser and it said / feed that, set 'expiration date' of 'cookie' as '01 Jan 1970 00:00:00 ' ie cookies are already expired.
        res.redirect('/admin/login');
    });
};


