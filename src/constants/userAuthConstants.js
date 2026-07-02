export const AUTH_CONFIG = {                    // Here 'AUTH_CONFIG' is the 'object' and 'SIGNUP_OTP_EXPIRY_MS' etc are its properties and we can use these value in other files like 'AUTH_CONFIG.SIGNUP_OTP_EXPIRY_MS' after 'import' 'src/constants/userAuthConstant.js' file.
    SIGNUP_OTP_EXPIRY_MS: 3 * 60 * 1000,        // 3 Minutes
    PROFILE_EMAIL_OTP_EXPIRY_MS: 5 * 60 * 1000, // 5 Minutes
    HOME_PRODUCTS_LIMIT: 3,
    ADMIN_USERS_LIMIT: 5
};

export const AUTH_ROLES = {
    USER: 'user'
};

export const AUTH_REGEX = {
    NAME: /^[A-Za-z\s]{3,}$/,              // It allows 'capital letters', 'small letters' and 'spaces' and should contains 'at least' '3' characters(ie '{3,}')
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,   // It tells 'not' start with 'space' or '@' symbol(ie '[^\s@]') and matches 'one' '@' symbol(ie '+@') and then we can put any character 'except' 'space' or '@'('[^\s@])and then should put 'dot'(ie '\.')and then we can put anything 'except' 'space' or '@'(ie '[^\s@]').
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_'])[A-Za-z\d@$!%*?&_']{8,}$/  // In  '^(?=.*[a-z])' without other character '^' strictly follows 'start with' the following characters, and if we put only '( )' it includes all characters inside the '( )' ,  but here we put  '.*'  means it allows any the character in 'further' but should consider '[a-z]' and '{8,}' means 'at least' '8' character.  
};