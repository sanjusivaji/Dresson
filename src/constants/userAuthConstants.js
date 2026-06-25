export const AUTH_CONFIG = {
    SIGNUP_OTP_EXPIRY_MS: 3 * 60 * 1000,       // 3 Minutes
    PROFILE_EMAIL_OTP_EXPIRY_MS: 5 * 60 * 1000, // 5 Minutes
    HOME_PRODUCTS_LIMIT: 3,
    ADMIN_USERS_LIMIT: 5
};

export const AUTH_ROLES = {
    USER: 'user'
};

export const AUTH_REGEX = {
    NAME: /^[A-Za-z\s]{3,}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_'])[A-Za-z\d@$!%*?&_']{8,}$/
};