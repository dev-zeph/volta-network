import "server-only";
import { Resend } from "resend";

type Mail = { to: string; subject: string; html: string; text: string };

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function emailEnabled() {
  return !!process.env.RESEND_API_KEY?.trim();
}

/** The only place email is sent. Never throws. */
export async function sendEmail(mail: Mail): Promise<boolean> {
  try {
    if (!emailEnabled() || /[@.]example\.com$/i.test(mail.to)) {
      console.log(`[email skipped] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
      return false;
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (error) {
      console.error("[email failed]", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email failed]", e);
    return false;
  }
}

export function layout(heading: string, bodyHtml: string, button?: { label: string; href: string }) {
  const btn = button
    ? `<p style="margin:24px 0 0"><a href="${esc(button.href)}" style="display:inline-block;background:#6d28d9;color:#ffffff;padding:13px 22px;font:600 15px Arial,sans-serif;text-decoration:none">${esc(button.label)}</a></p>`
    : "";
  return `<div style="background:#f7f6f4;padding:32px 16px;font:15px/1.6 Arial,sans-serif;color:#17171a"><div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dcdad5;padding:28px"><div style="font:700 13px Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6d28d9;margin-bottom:14px">Volta Network</div><h1 style="font-size:22px;line-height:1.2;margin:0 0 14px">${esc(heading)}</h1>${bodyHtml}${btn}</div></div>`;
}
