export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, service, eventId, userAgent, eventSourceUrl, fbp, fbc, lang } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const SHEET_URL      = process.env.GOOGLE_SHEET_URL;
  const PIXEL_ID       = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN   = process.env.META_ACCESS_TOKEN;
  const TG_TOKEN       = process.env.TELEGRAM_BOT_TOKEN;
  const TG_CHAT_ID     = process.env.TELEGRAM_CHAT_ID;

  const timestamp = Math.floor(Date.now() / 1000);

  // Send to Google Sheets
  if (SHEET_URL) {
    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, service, lang, timestamp: new Date().toISOString() })
      });
    } catch (_) {}
  }

  // Send Meta CAPI Lead event
  if (PIXEL_ID && ACCESS_TOKEN) {
    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const userData = {
        ph: [phoneDigits],
        client_user_agent: userAgent || '',
      };
      if (fbp) userData.fbp = fbp;
      if (fbc) userData.fbc = fbc;

      await fetch(`https://graph.facebook.com/v20.0/${PIXEL_ID}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: 'Lead',
            event_time: timestamp,
            event_id: eventId,
            event_source_url: eventSourceUrl || '',
            action_source: 'website',
            user_data: userData,
            custom_data: { service: service || 'Mayfair Glow' }
          }],
          access_token: ACCESS_TOKEN
        })
      });
    } catch (_) {}
  }

  // Send Telegram notification
  if (TG_TOKEN && TG_CHAT_ID) {
    try {
      const date = new Date().toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca', hour12: false });
      const waLink = `https://wa.me/${phone.replace(/\D/g, '')}`;
      const msg = `🌸 *ليد جديد — Mayfair Glow*\n\n👤 *الاسم:* ${name}\n📱 *الواتساب:* ${phone}\n⏰ ${date}\n\n💬 [فتح واتساب](${waLink})`;
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: msg, parse_mode: 'Markdown' })
      });
    } catch (_) {}
  }

  return res.status(200).json({ ok: true });
}
