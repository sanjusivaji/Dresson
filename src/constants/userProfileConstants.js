export const PROFILE_CONFIG = {
    EMAIL_OTP_EXPIRY_MS: 5 * 60 * 1000 // 5 Minutes
};

export const PROFILE_REGEX = {
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_'])[A-Za-z\d@$!%*?&_']{8,}$/
};