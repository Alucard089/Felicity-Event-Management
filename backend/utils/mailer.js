const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

/**
 * Create a nodemailer transporter using credentials from .env.
 * Falls back gracefully if credentials are not configured.
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Generate a QR code as a base64 PNG data-URL string.
 * Payload is a JSON object describing the ticket.
 */
async function generateQRDataUrl(payload) {
  const text = JSON.stringify(payload);
  return await QRCode.toDataURL(text, {
    width: 200,
    margin: 2,
    color: { dark: "#1e1b4b", light: "#ffffff" },
  });
}

/**
 * Build an HTML email body for a registration confirmation.
 *
 * @param {Object} opts
 * @param {string}  opts.participantName   - "John Doe"
 * @param {string}  opts.participantEmail
 * @param {string}  opts.college
 * @param {string}  opts.eventName
 * @param {string}  opts.eventType         - "normal" | "merchandise"
 * @param {string}  opts.organizerName
 * @param {string}  opts.startDate         - ISO string
 * @param {string}  opts.endDate           - ISO string or null
 * @param {string}  opts.ticketId
 * @param {string}  opts.teamName
 * @param {number}  opts.quantity          - merchandise only
 * @param {string}  opts.variantLabel      - merchandise only
 * @param {string}  opts.qrDataUrl         - base64 data URL
 */
function buildEmailHTML(opts) {
  const fmt = (d) =>
    d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const isMerch = opts.eventType === "merchandise";

  const extraRows = isMerch
    ? `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Variant</td>
        <td style="padding:6px 0;font-size:14px;font-weight:600;">${opts.variantLabel || "—"}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Quantity</td>
        <td style="padding:6px 0;font-size:14px;font-weight:600;">${opts.quantity || 1}</td>
      </tr>`
    : "";

  const teamRow =
    opts.teamName
      ? `<tr>
          <td style="padding:6px 0;color:#6b7280;font-size:14px;">Team</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;">${opts.teamName}</td>
        </tr>`
      : "";

  const collegeRow =
    opts.college
      ? `<tr>
          <td style="padding:6px 0;color:#6b7280;font-size:14px;">College</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;">${opts.college}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px;">Felicity</p>
              <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">
                ${isMerch ? "Purchase Confirmation" : "Registration Confirmation"}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:16px;">Hi <strong>${opts.participantName}</strong>,</p>
              <p style="margin:8px 0 0;color:#555;font-size:14px;line-height:1.6;">
                Your ${isMerch ? "purchase" : "registration"} for
                <strong>${opts.eventName}</strong> has been confirmed.
                Your ticket is below.
              </p>
            </td>
          </tr>

          <!-- Ticket ID Banner -->
          <tr>
            <td style="padding:20px 32px;">
              <div style="background:#eef2ff;border:2px dashed #818cf8;border-radius:8px;padding:16px;text-align:center;">
                <p style="margin:0;color:#4f46e5;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Ticket ID</p>
                <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:#312e81;letter-spacing:2px;">${opts.ticketId}</p>
              </div>
            </td>
          </tr>

          <!-- QR Code -->
          <tr>
            <td align="center" style="padding:0 32px 16px;">
              <img
                src="${opts.qrDataUrl}"
                alt="QR Code"
                width="160"
                style="display:block;border-radius:8px;border:1px solid #e5e7eb;"
              />
              <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">
                Show this QR code at the event venue.
              </p>
            </td>
          </tr>

          <!-- Details Table -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f3f4f6;">
                <tr>
                  <td style="padding:16px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.5px;" colspan="2">
                    Event Details
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;width:140px;">Event</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;">${opts.eventName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Type</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;text-transform:capitalize;">${opts.eventType}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Organizer</td>
                  <td style="padding:6px 0;font-size:14px;">${opts.organizerName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Start</td>
                  <td style="padding:6px 0;font-size:14px;">${fmt(opts.startDate)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">End</td>
                  <td style="padding:6px 0;font-size:14px;">${fmt(opts.endDate)}</td>
                </tr>

                <tr>
                  <td style="padding:16px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.5px;" colspan="2">
                    Participant Details
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Name</td>
                  <td style="padding:6px 0;font-size:14px;">${opts.participantName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Email</td>
                  <td style="padding:6px 0;font-size:14px;">${opts.participantEmail}</td>
                </tr>
                ${collegeRow}
                ${teamRow}
                ${extraRows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                This is an automated email from Felicity. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a ticket confirmation email.
 * Non-blocking — errors are logged but never thrown to the caller.
 *
 * @param {string} toEmail
 * @param {Object} opts  — same shape as buildEmailHTML opts (without qrDataUrl)
 */
async function sendTicketEmail(toEmail, opts) {
  // Silently skip if email is not configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
      process.env.EMAIL_USER === "your_gmail@gmail.com") {
    console.log(`[mailer] Email not configured — skipping ticket email to ${toEmail}`);
    return;
  }

  try {
    const qrPayload = {
      ticketId:    opts.ticketId,
      event:       opts.eventName,
      participant: opts.participantName,
      email:       opts.participantEmail,
    };

    const qrDataUrl = await generateQRDataUrl(qrPayload);
    const html = buildEmailHTML({ ...opts, qrDataUrl });

    const transporter = createTransporter();
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to:      toEmail,
      subject: `Your ${opts.eventType === "merchandise" ? "purchase" : "registration"} ticket — ${opts.eventName} [${opts.ticketId}]`,
      html,
    });
    console.log(`[mailer] Ticket email sent to ${toEmail} (${opts.ticketId})`);
  } catch (err) {
    console.error(`[mailer] Failed to send email to ${toEmail}:`, err.message);
  }
}

module.exports = { sendTicketEmail };
