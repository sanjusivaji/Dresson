import bcrypt from 'bcrypt';

import User from './src/model/userModel.js';


const  generatePassword = ()  {
const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt); 
}
 