# Email Setup — Felicity Confirmation Emails

## Overview

When a participant successfully registers for a **Normal event** or completes a **Merchandise purchase**, the system automatically sends an HTML confirmation email to their registered email address. The email contains full event and participant details, the unique **Ticket ID**, and a **QR code** image.

---

## How It Was Set Up

### Step 1 — Gmail App Password

Google blocks apps from using a regular Gmail password. Instead, you generate a dedicated **App Password** from your Google account:

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sign in and ensure **2-Step Verification** is enabled
3. Create a new app — name used: **DASS_FELICITY**
4. Google generates a 16-character password (e.g. `ivre vbfm nnbu pkwq`)
5. This password is only shown once — copy it immediately

The space formatting (`xxxx xxxx xxxx xxxx`) is just for readability; nodemailer accepts it as-is.

### Step 2 — Environment Variables (`backend/.env`)

The following three variables were added to `backend/.env`:

```env
EMAIL_USER=ashoaib863@gmail.com
EMAIL_PASS=ivre vbfm nnbu pkwq
EMAIL_FROM=Felicity Events <ashoaib863@gmail.com>
```

| Variable | Purpose |
|----------|---------|
| `EMAIL_USER` | The Gmail address used to authenticate with Google SMTP |
| `EMAIL_PASS` | The App Password generated in Step 1 (NOT your Gmail login password) |
| `EMAIL_FROM` | The display name + address shown in the recipient's inbox |

> These variables are read at runtime via `process.env.*` — they are never hardcoded in source files.

### Step 3 — Packages Installed

```bash
cd backend
npm install nodemailer qrcode
```

| Package | Version | Purpose |
|---------|---------|---------|
| `nodemailer` | ^6.x | Sends email via Gmail SMTP |
| `qrcode` | ^1.5.x | Generates QR code as a base64 PNG image server-side |

---

## Architecture

```
POST /api/registrations/:eventId
  │
  ├── Validate (eligibility, deadline, limit, stock, duplicate)
  ├── Decrement stock (merchandise)
  ├── Save Registration document
  ├── res.status(201).json(...)    ← HTTP response sent immediately
  │
  └── sendTicketEmail(...)         ← fire-and-forget (async, non-blocking)
        │
        ├── generateQRDataUrl(payload) → base64 PNG
        ├── buildEmailHTML(opts)       → HTML string
        └── transporter.sendMail(...)  → Gmail SMTP
```

The email is sent **after** the HTTP response. This means:
- The user sees "Registration successful" instantly
- The email arrives seconds later
- If email fails, it logs an error but **never breaks the registration flow**

---

## File: `backend/utils/mailer.js`

This is the utility module that handles all email logic. It exports one function:

```js
const { sendTicketEmail } = require("../utils/mailer");
```

### `createTransporter()`

Creates a nodemailer transport configured for Gmail SMTP:

```js
nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

### `generateQRDataUrl(payload)`

Uses the `qrcode` package to convert a JSON object into a base64 PNG data URL suitable for embedding directly in an `<img>` tag inside the HTML email:

```js
const qrPayload = {
  ticketId:    "TKT-A3F92E1C4B27",
  event:       "TechFest 2026",
  participant: "John Doe",
  email:       "john@example.com",
};
const dataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
  width: 200,
  margin: 2,
  color: { dark: "#1e1b4b", light: "#ffffff" },
});
// → "data:image/png;base64,iVBORw0KGgo..."
```

This data URL is embedded directly in the email `<img src="...">` tag — no external server needed, no broken image links.

### `buildEmailHTML(opts)`

Builds the full HTML email as a string. The email structure:

| Section | Content |
|---------|---------|
| **Header** | Indigo banner with "Felicity" logo and "Registration/Purchase Confirmation" subtitle |
| **Greeting** | Personalised "Hi [Name]" message |
| **Ticket ID Banner** | Large, dashed-border box showing the unique ticket ID |
| **QR Code** | Inline base64 PNG image (160×160px displayed) |
| **Event Details** | Event name, type, organizer, start date, end date |
| **Participant Details** | Full name, email, college (if set), team name (if set) |
| **Merchandise Extras** | Variant label + quantity (merchandise events only) |
| **Footer** | "Do not reply" notice |

The email is fully inline-styled for maximum compatibility across email clients (Gmail, Outlook, etc.).

### `sendTicketEmail(toEmail, opts)`

The main exported function:

```js
await sendTicketEmail("participant@example.com", {
  participantName:  "John Doe",
  participantEmail: "participant@example.com",
  college:          "IIIT Hyderabad",
  eventName:        "TechFest 2026",
  eventType:        "normal",           // or "merchandise"
  organizerName:    "Programming Club",
  startDate:        "2026-03-15T09:00:00Z",
  endDate:          "2026-03-15T18:00:00Z",
  ticketId:         "TKT-A3F92E1C4B27",
  teamName:         "Team Alpha",       // optional
  quantity:         2,                  // merchandise only
  variantLabel:     "Large / Black",    // merchandise only
});
```

**Graceful fallback**: if `EMAIL_USER` is not configured or still has the placeholder value, the function logs a skip message and returns without throwing — so development environments without email set up still work fine.

---

## Where It's Called (`backend/routes/registrations.js`)

```js
// After res.status(201).json(...) — fire-and-forget
const p = populated.participant;
const e = populated.event;

// For merchandise: resolve the human-readable variant label
const variantLabel = event.eventType === "merchandise" && selectedVariant
  ? (() => {
      const v = event.variants.id(selectedVariant);
      return v ? (v.label || `${v.size} ${v.color}`).trim() : "";
    })()
  : undefined;

sendTicketEmail(p.email, {
  participantName:  `${p.firstName} ${p.lastName}`,
  participantEmail: p.email,
  college:          p.college || "",
  eventName:        e.name,
  eventType:        e.eventType,
  organizerName:    e.organizer?.name || "—",
  startDate:        e.startDate,
  endDate:          e.endDate || null,
  ticketId,
  teamName:         teamName || "",
  quantity:         event.eventType === "merchandise" ? (quantity || 1) : undefined,
  variantLabel,
});
```

The `event.variants.id(selectedVariant)` call uses Mongoose's built-in subdocument lookup method to find the variant by its `_id` within the variants array — the same pattern used for stock decrement.

---

## QR Code Contents

The QR code encodes the following JSON (same as the frontend ticket modal):

```json
{
  "ticketId": "TKT-A3F92E1C4B27",
  "event": "TechFest 2026",
  "participant": "John Doe",
  "email": "john@example.com"
}
```

A scanner at the venue can read this and verify attendance. The `ticketId` is the primary identifier — it is globally unique (backed by `crypto.randomBytes(6)` + a `unique: true` index in MongoDB).

---

## Gmail SMTP Limits

| Limit | Value |
|-------|-------|
| Free daily send limit | 500 emails/day |
| Rate limit | ~20 emails/second |

For the purposes of this assignment these limits are more than sufficient.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `[mailer] Email not configured — skipping` | `EMAIL_USER` is still the placeholder | Fill in real credentials in `.env` |
| `Invalid login` error in console | Wrong app password or 2FA not enabled | Regenerate app password at myaccount.google.com/apppasswords |
| Email not in inbox | Sent to spam | Check spam folder; add sender to contacts |
| `Less secure apps` auth error | Using regular Gmail password | Must use an App Password, not Gmail login password |
