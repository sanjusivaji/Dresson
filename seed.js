// import bcrypt from 'bcrypt';

// const dbHash = '$2b$10$FmQE5tBoOL49mBue/BGohu23Hc4PmQyQXuq9hNxUOf4ktRVgtUz1q';
// const passwordToTest = 'admin@123';

// const isMatch = await bcrypt.compare(passwordToTest, dbHash);
// console.log(" Does the database hash match 'admin@123'?:", isMatch);
// console.log(process.env)


import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './src/model/userModel.js'; // Adjust this path to point to your actual userModel.js file

const seedAdmins = async () => {
    try {
    
        await mongoose.connect('mongodb://localhost:27017/dresson'); 
        console.log('Connected to Database...');

        // 2. Hash the default password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin@123', salt);

        const adminUsers = [
            {
                firstName: 'Super',
                lastName: 'Admin',
                email: 'admin@dresson.com',
                normalizedEmail: 'admin@dresson.com',
                password: hashedPassword,
                role: 'super_admin', // Custom role identifier
                status: 'Active',
                isVerified: true
            },
            {
                firstName: 'Admin',
                lastName: 'One',
                email: 'admin1@dresson.com',
                normalizedEmail: 'admin1@dresson.com',
               // password: adminOnePassword,
                role: 'admin',
                status: 'Active',
                isVerified: true
            },
            {
                firstName: 'Admin',
                lastName: 'Two',
                email: 'admin2@dresson.com',
                normalizedEmail: 'admin2@dresson.com',
              //  password: adminTwoPassword,
                role: 'admin',
                status: 'Active',
                isVerified: true
            }
        ];

        for (const admin of adminUsers) {
            await User.findOneAndUpdate(
                { email: admin.email },
                { $set: admin },
                { upsert: true, new: true }
            );
            console.log(`Successfully seeded user: ${admin.email}`);
        }

        console.log('All admins seeded successfully!');
        
        // 5. Disconnect and exit
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};


seedAdmins();