export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { email, taskTitle, scheduledTime } = body || {};

    if (!email || !taskTitle) {
      return res.status(400).json({ error: "Email and task title are required" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "RESEND_API_KEY environment variable is not configured" });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StudyKHP <onboarding@resend.dev>",
        to: [email],
        subject: `[StudyKHP Reminder] Scheduled Task: ${taskTitle} (${scheduledTime || "Now"})`,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 30px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: rgba(99, 102, 241, 0.12); color: #6366f1; font-weight: bold; font-size: 20px;">S</div>
            <h2 style="color: #0f172a; margin: 12px 0 4px; font-size: 20px;">StudyKHP Task Reminder</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Your scheduled study block is starting now</p>
          </div>

          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Hello,
          </p>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            This is a scheduled reminder for your study block:
          </p>

          <div style="margin: 24px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1; border-radius: 10px; padding: 18px 20px;">
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
              ${taskTitle}
            </div>
            ${
              scheduledTime
                ? `<div style="font-size: 13px; color: #6366f1; font-family: monospace; font-weight: 600;">
                    Scheduled time: ${scheduledTime}
                   </div>`
                : ""
            }
          </div>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Stay focused, eliminate distractions, and keep your study streak alive!
          </p>

          <div style="text-align: center; margin: 28px 0 16px;">
            <a href="https://studykph-portfolio.vercel.app/dashboard" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 10px;">
              Open StudyKHP Dashboard
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center;">
            Sent by StudyKHP Automated Reminder System.
          </p>
        </div>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Failed to send reminder via Resend",
        details: data,
      });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}
