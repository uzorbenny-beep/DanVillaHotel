# Security Specification for Hotel Booking System

This file defines the Attribute-Based Access Control (ABAC) invariants, validation models, and negative payloads tested against the Firestore Fortress schema.

## Core Data Invariants

1. **Hotels & Rooms Read Permissions**: Anyone (public) may read and query hotels and rooms details. No deletion or editing is allowed through client SDKs.
2. **Booking Identity Integrity**: A user can only create or read a booking if they are signed in, and the `userId` field of the booking matches `request.auth.uid`.
3. **Immutability of Key Fields**: Once a booking is created, its `userId`, `hotelId`, `roomId`, `checkIn`, `checkOut`, and `totalPrice` fields are immutable.
4. **State Transitions**: A booking's status can only transition from `pending` -> `confirmed` or `cancelled`. Once a booking is marked `cancelled`, its state is locked.
5. **No Blind Global Reads**: Standard authenticated users can only list and query bookings matching their credentials via `resource.data.userId == request.auth.uid`.

## The "Dirty Dozen" Malicious Payloads

The following payloads represent attacks on structural validity and identity which must be rejected:
1. **Anonymous hotel edits**: Attacker attempts to write or delete a hotel document.
2. **Identity Hijacking**: Attacker logs in as `attacker123` but attempts to book a room with `userId: "victim456"`.
3. **Shadow Update / Privilege Escalation**: Attacker attempts to update an active booking with an inject variable `ghost_field_is_admin: true` to bypass payment.
4. **Self-Approval transition**: Set status to `confirmed` after creation without going through the secure backend payment confirmations.
5. **ID Poisoning**: Request a booking ID with size > 128 characters or characters like `../../hack_path` to trigger directory path traversals.
6. **Denial of Wallet Range**: Send a booking request with total price exceeding numeric boundaries or string parameters payload size > 500 characters.
7. **Bilinear temporal disruption**: Booking check-out set earlier than check-in date.
8. **Negative resource selection**: Select negative room counts or pricing variables.
9. **Null check-in timestamp**: Send a null date or mismatched formatting.
10. **Global List Scraping**: Attempting a collection listing query of bookings without specifying user-scoped reference boundaries.
11. **Immutability Bypass**: Altering room selection of an already stored booking document.
12. **Tampering with audit coordinates**: Bypassing the system-generated `createdAt` server timestamps.
