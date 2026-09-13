import crypto from 'crypto';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { token } = req.body || {};
    const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'default-secret-change-me';

    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parts = decoded.split(':');
        if (parts.length !== 3) return res.status(401).json({ valid: false });

        const [user, expires, sig] = parts;
        const expected = crypto.createHmac('sha256', TOKEN_SECRET)
            .update(`${user}:${expires}`).digest('hex');

        if (sig !== expected) return res.status(401).json({ valid: false });
        if (Date.now() > parseInt(expires)) return res.status(401).json({ valid: false });

        return res.status(200).json({ valid: true, user });
    } catch (err) {
        return res.status(401).json({ valid: false });
    }
}
