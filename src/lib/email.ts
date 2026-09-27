export async function sendInvitationEmail({
  toEmail,
  groupName,
  inviterName,
  inviteUrl,
}: {
  toEmail: string;
  groupName: string;
  inviterName: string;
  inviteUrl: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Tally <invites@tally.local>",
          to: [toEmail],
          subject: `${inviterName} invited you to join "${groupName}" on Tally`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e1; border-radius: 8px;">
              <h2 style="margin: 0 0 16px 0; color: #101112; font-size: 20px;">Join ${groupName} on Tally</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
                <strong>${inviterName}</strong> has invited you to split and track group expenses in <strong>${groupName}</strong>.
              </p>
              <div style="margin: 24px 0;">
                <a href="${inviteUrl}" style="background-color: #c84420; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
                  Accept Invitation &rarr;
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                Link expires in 7 days: <a href="${inviteUrl}" style="color: #c84420;">${inviteUrl}</a>
              </p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, messageId: data.id };
      }
    } catch (err) {
      console.warn("Resend email delivery failed, falling back to console dispatch:", err);
    }
  }

  // Fallback: Console email dispatch for local testing & development
  console.log(`\n======================================================`);
  console.log(`📧 [INVITATION EMAIL DISPATCHED]`);
  console.log(`To: ${toEmail}`);
  console.log(`Subject: ${inviterName} invited you to join "${groupName}" on Tally`);
  console.log(`Accept URL: ${inviteUrl}`);
  console.log(`======================================================\n`);

  return { success: true, messageId: "console-dispatched" };
}
