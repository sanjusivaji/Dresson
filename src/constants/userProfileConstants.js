export const PROFILE_CONFIG = {
    EMAIL_OTP_EXPIRY_MS: 3 * 60 * 1000 // 3 Minutes
};

export const PROFILE_REGEX = {
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_'])[A-Za-z\d@$!%*?&_']{8,}$/
};