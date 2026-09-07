// For check is it 'admin' or 'not' uses in 'src/routes/adminRoute.js' file
export const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        next(); 
    } else {
        res.redirect('/admin/login');
    }
};