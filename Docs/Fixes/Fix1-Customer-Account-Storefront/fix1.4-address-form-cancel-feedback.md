# Fix 1.4: Address Form Cancel Feedback Fix

> **Parent Group:** [Fix 1: Customer Account & Storefront UX](fix1-customer-account-storefront.md)
> **Status:** Not Started
> **Assigned To:** Member B (Frontend Addresses & Checkout UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Low
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `addresses`)

---

## Problem Description

When a customer opens the "Add Delivery Address" or "Update Delivery Address" form on `/addresses`, fills out fields partially, and clicks the **Cancel** button (or the `X` close icon), the page erroneously displays a green success banner: *"Address added successfully"* or *"Address updated"*, even though nothing was saved to the database.

---

## Root Cause

In `frontend/src/app/addresses/page.tsx`:
```tsx
<AddressForm 
  address={editingAddress} 
  onClose={() => { 
    setIsAdding(false); 
    setEditingAddress(null); 
    setSuccessMessage(editingAddress ? 'Address updated' : 'Address added successfully');
  }} 
/>
```
The `onClose` callback is called by both the Cancel button (`<Button onClick={onClose}>Cancel</Button>`) and the modal `X` button, as well as the successful form submit handler. Because `setSuccessMessage(...)` is inside `onClose`, cancelling triggers the success message unconditionally.

---

## Tasks

### Frontend — Member B
- [ ] In `frontend/src/app/addresses/page.tsx`:
  - Separate `onSuccess` and `onCancel` callbacks (or pass `{ saved: boolean }` parameter to `onClose`).
  - Only call `setSuccessMessage` when saving actually completes with a successful HTTP response.
  - On cancel or `X` dismiss, simply close the form without triggering any success alert.
  - Reset form field state cleanly so reopening starts fresh.

---

## Affected Files

- `frontend/src/app/addresses/page.tsx`

---

## Definition of Done

1. Clicking Cancel or the `X` button closes the address form without showing any success message.
2. Saving a new address or updating an existing address successfully persists the data to the backend and displays the appropriate success alert.
