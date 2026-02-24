# Feature 4 — Merchandise Payment Approval Workflow

**Tier:** A (8 marks)  
**Category:** Merchandise Payment Approval

---

## What This Feature Does

When a participant places a merchandise order, the order is **not confirmed immediately**. Instead, it follows a multi-step approval workflow:

1. **Participant places order** → Status: `pending_payment` (no stock deducted, no QR, no email)
2. **Participant uploads payment proof image** → Status: `pending_approval` (proof sent for review)
3. **Organizer reviews proof** → Approves or Rejects
   - **Approve** → Stock decremented, status `confirmed`, QR code generated, confirmation email sent
   - **Reject** → Status `rejected`, proof cleared, participant can re-upload

This ensures organizers can verify payment before committing stock, and participants get a clear workflow with visual feedback at every step.

---

## Files Modified / Created

### Backend

| File | What Changed |
|------|--------------|
| `backend/models/Registration.js` | Added `pending_payment`, `pending_approval` to status enum; added `paymentProofData` (String, base64) and `paymentStatus` (enum: `not_required`, `awaiting_proof`, `pending`, `approved`, `rejected`) fields |
| `backend/routes/registrations.js` | Modified POST registration for merchandise; added 4 new endpoints: `upload-proof`, `payment-proofs`, `approve-payment`, `reject-payment` |
| `backend/server.js` | Increased `express.json()` limit to 10 MB for base64 image uploads |

### Frontend

| File | What Changed |
|------|--------------|
| `frontend/src/pages/EventDetails.jsx` | Added payment proof upload UI, conditional QR display, status-specific messaging for each payment state |
| `frontend/src/pages/OrganizerEventDetail.jsx` | Added Payment Proofs management section with filter tabs, proof viewer modal, approve/reject buttons |

---

## Backend Implementation

### Registration Model Changes (`backend/models/Registration.js`)

```javascript
status: {
  type: String,
  enum: ["confirmed", "cancelled", "rejected", "pending_payment", "pending_approval"],
  default: "confirmed",
},
paymentProofData: { type: String, default: "" },  // base64 image
paymentStatus: {
  type: String,
  enum: ["not_required", "awaiting_proof", "pending", "approved", "rejected"],
  default: "not_required",
},
```

**Why two fields?** `status` is the overall registration status visible everywhere. `paymentStatus` tracks the payment workflow specifically. This separation keeps the existing registration logic (cancel, ticket lookup, etc.) clean.

**Why `awaiting_proof`?** To distinguish between "order placed but no proof uploaded" vs "proof uploaded and waiting for organizer" (`pending`). This way the upload-proof endpoint knows whether to accept or block duplicate uploads.

### Modified POST Registration (merchandise flow)

When `event.eventType === "merchandise"`:
- Stock is **NOT** decremented at registration time (deferred to approval)
- Registration is created with `status: "pending_payment"` and `paymentStatus: "awaiting_proof"`
- No confirmation email is sent
- Response message: "Order placed! Please upload your payment proof."
- Purchase limit check includes `pending_payment` and `pending_approval` statuses so users can't bypass limits by placing multiple unapproved orders

### New Endpoints

#### 1. `POST /api/registrations/:id/upload-proof`

**Who can call:** The participant who owns the registration  
**When allowed:** When `paymentStatus` is `awaiting_proof` or `rejected` (re-upload after rejection)

Takes `{ imageData: "data:image/png;base64,..." }` in the request body. Updates:
- `paymentProofData` → the base64 image string
- `paymentStatus` → `"pending"`
- `status` → `"pending_approval"`

**Why base64?** Simplest approach — no file storage, no multer, no cloud uploads. The image is stored directly in MongoDB. For a student project this is fine. The 10 MB express.json limit handles typical screenshot sizes.

#### 2. `GET /api/registrations/event/:eventId/payment-proofs`

**Who can call:** The organizer of the event  
**Query params:** `?status=pending` (or `approved`, `rejected`, `awaiting_proof`, `all`)

Returns all registrations for this event that have `paymentStatus !== "not_required"`, populated with participant info. Used by the organizer dashboard.

#### 3. `POST /api/registrations/:id/approve-payment`

**Who can call:** The organizer of the event  
**When allowed:** When `paymentStatus === "pending"`

On approval:
1. Checks stock availability (variant might have sold out since order was placed)
2. Decrements variant stock
3. Sets `paymentStatus: "approved"` and `status: "confirmed"`
4. Sends confirmation email with ticket details (fire-and-forget)

**Why check stock again?** Between order placement and approval, other orders may have been approved. This prevents overselling.

#### 4. `POST /api/registrations/:id/reject-payment`

**Who can call:** The organizer of the event  
**When allowed:** When `paymentStatus === "pending"`

On rejection:
- Sets `paymentStatus: "rejected"` and `status: "rejected"`
- **Clears** `paymentProofData` (so participant can upload a new image)
- Stock is NOT affected (was never decremented)

### Cancel Route Update

The existing cancel route was updated: it only restores stock if the registration was already `approved` (confirmed). Previously it always restored stock for merchandise, but now stock isn't decremented until approval.

---

## Frontend Implementation

### EventDetails.jsx — Participant View

#### New State Variables
```javascript
const [proofPreview, setProofPreview] = useState(null);      // base64 preview of selected file
const [uploadingProof, setUploadingProof] = useState(false);  // loading state for upload
const [proofMsg, setProofMsg] = useState("");                 // success/error message
```

#### fetchMyRegistration Update
Now finds registrations in ANY non-cancelled status (including `pending_payment`, `pending_approval`, `rejected`) — not just `confirmed`. This ensures the participant sees the correct UI state after placing a merchandise order.

#### handleRegister Update
For merchandise events, after successful registration:
- Does NOT open the ticket modal (no QR yet)
- Shows the success message from the backend ("Order placed! Please upload your payment proof.")
- The "pending_payment" UI section appears automatically

#### Payment Proof Upload
- `handleProofFile(e)` — reads the selected file as a base64 data URL using `FileReader`
  - Validates file type (must be an image) and size (max 5 MB)  
  - Sets `proofPreview` for visual confirmation before upload
- `handleUploadProof()` — POSTs the base64 data to `/api/registrations/:id/upload-proof`
  - On success, refreshes the registration to show the "pending_approval" UI

#### Status-Specific UI Sections

| Status | UI Shown |
|--------|----------|
| `confirmed` | Green "You are registered" box with Ticket ID link and "View Ticket & QR Code" button |
| `pending_payment` | Amber "Order Placed" box with file input, image preview, and "Upload Payment Proof" button |
| `pending_approval` | Blue "Waiting for Approval" informational box |
| `rejected` | Red box with error message AND file input to re-upload proof |

#### QR Code Conditional Display
The ticket modal now checks `ticket.status === "confirmed"` before rendering the `<QRCodeSVG>`. If the order is not confirmed, it shows a yellow message: "QR code will be generated once payment is approved."

### OrganizerEventDetail.jsx — Organizer View

#### New State & Functions
```javascript
const [paymentOrders, setPaymentOrders] = useState([]);
const [paymentFilter, setPaymentFilter] = useState("pending");
const [proofModal, setProofModal] = useState(null);
const [actionMsg, setActionMsg] = useState("");
```

- `loadPaymentOrders(filter)` — fetches payment proof registrations from the new GET endpoint
- `handleApprove(orderId)` — calls approve-payment with confirmation dialog, refreshes stats
- `handleReject(orderId)` — calls reject-payment with confirmation dialog

#### Payment Proofs Section
Only shown when `event.eventType === "merchandise"`. Contains:

1. **Filter tabs:** `pending` | `awaiting_proof` | `approved` | `rejected` | `all`
2. **Order cards:** Shows participant name, email, variant, quantity, amount, date, and status badge
   - Each card has a "View Proof" button (only if proof image exists)
3. **Proof modal:** Opens a full-screen overlay showing:
   - Participant details
   - The payment proof image at full size
   - Approve / Reject buttons (only when status is `pending`)
   - Status message for already-approved or already-rejected orders

---

## Payment Status Flow Diagram

```
[Order Placed]
     │
     ▼
paymentStatus: "awaiting_proof"
status: "pending_payment"
     │
     │ (participant uploads image)
     ▼
paymentStatus: "pending"
status: "pending_approval"
     │
     ├──(organizer approves)──▶ paymentStatus: "approved", status: "confirmed"
     │                          Stock decremented, email sent, QR available
     │
     └──(organizer rejects)───▶ paymentStatus: "rejected", status: "rejected"
                                Proof cleared, participant can re-upload
                                     │
                                     │ (re-upload)
                                     ▼
                                paymentStatus: "pending"
                                status: "pending_approval"
                                     │
                                     └── (cycle continues)
```

---

## Viva Q&A

**Q: Why not decrement stock when the order is placed?**  
A: If we decremented stock immediately, a user could hold stock indefinitely without paying. By deferring stock decrement to approval, we ensure stock is only committed when payment is verified. The trade-off is a slight race condition (two orders could be placed for the last item), but we handle this by checking stock again at approval time.

**Q: Why store images as base64 in MongoDB instead of using file uploads?**  
A: For simplicity. Base64 in MongoDB avoids needing multer, file storage, or cloud services. The downside is larger document sizes, but for a student project with limited concurrent users, this is acceptable. We set express.json limit to 10 MB to accommodate this.

**Q: What happens if the organizer rejects a payment?**  
A: The proof data is cleared and the status is set to "rejected". The participant sees a red warning with a file input to re-upload a new proof. This creates a cycle: upload → review → reject → re-upload → review... until approved or the participant gives up.

**Q: Why do you have both `status` and `paymentStatus` fields?**  
A: `status` controls overall registration behavior (ticket lookup, cancellation, etc.) and is already used throughout the codebase. `paymentStatus` specifically tracks the payment workflow. This separation means existing features (participant lists, CSV export, analytics) continue to work without changes — they just see the registration status.

**Q: How does the purchase limit work with pending orders?**  
A: The purchase limit check aggregates quantities across `confirmed`, `pending_payment`, and `pending_approval` statuses. This prevents a user from placing multiple orders that would exceed the limit, even while previous orders are still pending.

**Q: What if stock runs out between order placement and approval?**  
A: The approve-payment endpoint checks stock availability before approving. If stock is insufficient, it returns an error: "Not enough stock to approve this order." The organizer would need to reject the order or wait for cancellations to free up stock.

**Q: How does cancellation work for merchandise with this flow?**  
A: The cancel route was updated to only restore stock if the payment was already approved (confirmed). For pending orders, no stock was ever decremented, so nothing to restore.

---

## How to Test

1. Create a merchandise event with variants and stock (as organizer)
2. Publish the event
3. Login as a participant, go to the event page
4. Select a variant, quantity, and click "Purchase"
5. You should see the amber "Upload Payment Proof" section
6. Select an image file and click "Upload Payment Proof"
7. After upload, you should see the blue "Waiting for Approval" message
8. Login as the organizer, go to the event detail page
9. Scroll to "Payment Proofs" section → you should see the pending order
10. Click "View Proof" → see the image in a modal
11. Click "Approve" → order confirmed, stock decremented
12. Login as participant again → you should see the green "Registered" box with QR code
13. Test rejection: repeat steps 4-7 with another order, then reject as organizer → participant sees re-upload option
