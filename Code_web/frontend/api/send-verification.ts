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
    const { email, name, code } = body || {};

    if (!email || !code) {
      return res.status(400).json({ error: "Email and OTP code are required" });
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
        subject: `[StudyKHP] Mã xác thực tài khoản của bạn: ${code}`,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 30px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: rgba(99, 102, 241, 0.12); color: #6366f1; font-weight: bold; font-size: 20px;">S</div>
            <h2 style="color: #0f172a; margin: 12px 0 4px; font-size: 20px;">StudyKHP</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Xác thực địa chỉ Email của bạn</p>
          </div>

          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Xin chào <strong>${name || "bạn"}</strong>,
          </p>

          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản StudyKHP. Dưới đây là mã xác thực OTP 6 số để kích hoạt tài khoản của bạn:
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 16px 36px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #6366f1; font-family: monospace;">
              ${code}
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Mã này có hiệu lực trong vòng 10 phút</p>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
          </p>
        </div>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Failed to send email via Resend",
        details: data,
      });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}
