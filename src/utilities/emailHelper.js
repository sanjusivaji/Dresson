export default function normalizeEmail(email) {
    if (!email) return '';
    const cleanEmail = email.trim().toLowerCase();
    let [localPart, domain] = cleanEmail.split('@');
    if (!domain) return cleanEmail;
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        localPart = localPart.split('+')[0];
        localPart = localPart.replace(/\./g, '');
        domain = 'gmail.com';
    } else if (domain === 'outlook.com' || domain === 'hotmail.com') {
        localPart = localPart.split('+')[0];
    }
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
    localPart = localPart.split('+')[0].replace(/\./g, '');
    domain = 'gmail.com';
    } else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'icloud.com') {
        localPart = localPart.split('+')[0];               // Outlook and iCloud support '+', but do NOT ignore dots
    } else if (domain === 'yahoo.com' || domain === 'ymail.com') {
        localPart = localPart.split('-')[0];              // Yahoo historically uses hyphens '-' for disposable aliases!
    }
        return `${localPart}@${domain}`;
    }