/**
 * Outgoing email: admin invitations and login details.
 *
 * SMTP details come from the dashboard (Team -> Email settings), or from
 * SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM in .env, which
 * win when set. The password is never sent back to the browser.
 */
import nodemailer from 'nodemailer';
import { read } from '../db.js';

export function mailConfig() {
  const saved = read().mail || {};
  const env = process.env;
  return {
    host: env.SMTP_HOST || saved.host || '',
    port: Number(env.SMTP_PORT || saved.port || 587),
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : Boolean(saved.secure),
    user: env.SMTP_USER || saved.user || '',
    pass: env.SMTP_PASS || saved.pass || '',
    from: env.MAIL_FROM || saved.from || saved.user || '',
    fromEnv: Boolean(env.SMTP_HOST),
  };
}

export const mailReady = () => {
  const c = mailConfig();
  return Boolean(c.host && c.user && c.pass);
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A simple, good-looking HTML email that works in every mail app. */
function layout({ store, heading, lines, button, footer }) {
  const body = lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#57514a">${l}</p>`).join('');
  const btn = button
    ? `<p style="margin:26px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#1f1c19;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px">${esc(button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:12.5px;color:#8b847b">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all;color:#57514a">${esc(button.href)}</span></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f0eb;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0eb;padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e2da">
      <tr><td style="background:#1f1c19;padding:22px 28px;color:#f3eee7;font-size:18px;font-weight:800;letter-spacing:-0.02em">${esc(store)}</td></tr>
      <tr><td style="padding:30px 28px 18px">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1f1c19">${esc(heading)}</h1>
        ${body}${btn}
      </td></tr>
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #e7e2da;font-size:12px;line-height:1.6;color:#8b847b">${footer}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/**
 * Sends one email. Resolves { sent: true } or { sent: false, reason } and
 * never throws, so a mail problem can always be shown to the owner calmly.
 */
export async function sendMail({ to, subject, heading, lines, button, footer }) {
  const c = mailConfig();
  if (!c.host || !c.user || !c.pass) return { sent: false, reason: 'Email is not set up yet' };
  const store = read().settings?.storeName || 'Style & Carry';
  try {
    const transport = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.secure || c.port === 465,
      auth: { user: c.user, pass: c.pass },
      connectionTimeout: 15000,
    });
    const info = await transport.sendMail({
      from: `"${store.replace(/"/g, '')}" <${c.from || c.user}>`,
      to,
      subject,
      html: layout({ store, heading, lines, button, footer: footer || `You are receiving this because of your ${esc(store)} store dashboard.` }),
      text: [heading, '', ...lines.map((l) => l.replace(/<[^>]+>/g, '')), button ? `\n${button.label}: ${button.href}` : ''].join('\n'),
    });
    // Test inboxes (ethereal.email) give a web preview; log it for the developer.
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('[mail] preview:', preview);
    return { sent: true };
  } catch (err) {
    console.error('[mail]', err.message);
    return { sent: false, reason: err.message };
  }
}

export { esc };
