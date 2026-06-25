export const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        next(); 
    } else {
        res.redirect('/admin/login');
    }
};