import bcrypt from 'bcrypt';
import * as adminAuthRepository from '../../repository/admin/adminAuthRepository.js';
import { ADMIN_ROLES } from '../../constants/adminAuthConstants.js';

export const verifyAdminCredentials = async (email, password) => {
    const adminUser = await adminAuthRepository.findAdminByEmail(email, ADMIN_ROLES.SUPER_ADMIN);
    if (!adminUser) {
        throw new Error("Access Denied: Invalid administrative credentials.");
    }
    const passwordMatch = await bcrypt.compare(password, adminUser.password);        
    if (!passwordMatch) {
        throw new Error("Access Denied: Invalid administrative credentials.");
    }        
    return adminUser;
};


export const getDashboardData = async () => {
    return {
        stats: { totalSales: 98000, totalOrders: 55, activeOrders: 1, newUsers: 105 },
        brands: [ { name: "Van Heusen", percentage: 85 }, { name: "Zara", percentage: 65 } ],
        categories: [ { name: "Casual", percentage: 75 }, { name: "Party wear", percentage: 55 } ],
        products: [ { 
            image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=100", 
            name: "Shirt", 
            category: "Casual", 
            price: 1500, 
            sold: 12, 
            revenue: 18000, 
            stock: 45, 
            date: "2026-06-19" 
        } ]
    };
};