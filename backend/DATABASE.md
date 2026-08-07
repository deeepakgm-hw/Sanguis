# 🗄️ Sanguis Database Architecture & ERD Documentation

The Sanguis data layer uses **MongoDB** as its primary persistence store, with **Mongoose ORM** enforcing schema validation, virtual fields (such as `isEligible`), pre-save hooks, and 2dsphere geospatial indexes. A secondary **Prisma Schema** (`backend/prisma/schema.prisma`) is maintained as a type-safe schema reference and query interface for read-heavy operations.

---

## 📐 Entity Relationship Diagram (ERD) Overview

```
 ┌──────────────┐         1:1         ┌──────────────────┐
 │     User     ├────────────────────►│ UserPreferences  │
 └──────┬───────┘                     └──────────────────┘
        │
        │ 1:1 (for role = "donor")
        ▼
 ┌──────────────┐                     ┌──────────────────┐
 │    Donor     ├────────────────────►│DonorAvailability │
 └──────┬───────┘ 1:N                 └──────────────────┘
        │
        │ 1:N
        ▼
 ┌──────────────┐         N:1         ┌──────────────────┐
 │    Match     │◄────────────────────┤   BloodRequest   │
 └──────────────┘                     └────────┬─────────┘
                                               │
                                               │ N:1 (hospital user)
                                               ▼
                                      ┌──────────────────┐
                                      │  User (Hospital) │
                                      └──────────────────┘
```

---

## 📂 Core Collections & Schemas

### 1. `users` (`User.ts`)
Stores account credentials, authentication parameters, user roles, and verification status.
- `_id`: `ObjectId` (Primary Key)
- `name`: `String` (Required)
- `email`: `String` (Required, Unique, Indexed)
- `passwordHash`: `String` (BCrypt / Argon2 hash)
- `role`: `String` (Enum: `"user" | "admin" | "moderator" | "hospital" | "donor"`)
- `avatarUrl`: `String` (Optional)
- `isEmailVerified`: `Boolean` (Default: `false`)
- `mfaEnabled`: `Boolean` (Default: `false`)
- **Indexes**: `{ email: 1 }` (unique)

---

### 2. `donors` (`Donor.ts`)
Stores donor medical parameters, blood group, geolocation, and computed trust score.
- `_id`: `ObjectId` (Primary Key)
- `userId`: `ObjectId` → `User._id` (Unique, Indexed)
- `bloodType`: `String` (Enum: `"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"`, Indexed)
- `lastDonationDate`: `Date` (Optional, Nullable)
- `medicalFlags`: `Mixed` (Medical conditions / flags)
- `location`: `GeoJSON Point` `{ type: "Point", coordinates: [lng, lat] }` (Indexed 2dsphere)
- `trustScore`: `Number` (Range: 0–100, Default: 0, Indexed)
- **Virtuals**: `isEligible` (`true` if `lastDonationDate` is null or >90 days ago)
- **Indexes**: `{ userId: 1 }` (unique), `{ bloodType: 1 }`, `{ location: "2dsphere" }`, `{ trustScore: -1 }`

---

### 3. `bloodrequests` (`BloodRequest.ts`)
Emergency blood request tickets created by verified hospitals or users.
- `_id`: `ObjectId` (Primary Key)
- `bloodType`: `String` (Enum: `"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"`, Indexed)
- `unitsNeeded`: `Number` (Min: 1)
- `urgencyLevel`: `String` (Enum: `"low" | "medium" | "high" | "critical"`, Indexed)
- `hospital`: `ObjectId` → `User._id` (Hospital user, Indexed)
- `hospitalName`: `String` (Hospital display title)
- `description`: `String` (Optional clinical note)
- `status`: `String` (Enum: `"open" | "matched" | "fulfilled" | "cancelled" | "expired"`, Indexed)
- `geoLocation`: `GeoJSON Point` `{ type: "Point", coordinates: [lng, lat] }` (Indexed 2dsphere)
- **Indexes**: `{ bloodType: 1 }`, `{ urgencyLevel: 1 }`, `{ status: 1 }`, `{ geoLocation: "2dsphere" }`

---

### 4. `matches` (`Match.ts`)
Represents donor-to-request dispatch connections made by the Sanguis matching engine.
- `_id`: `ObjectId` (Primary Key)
- `bloodRequest`: `ObjectId` → `BloodRequest._id` (Indexed)
- `donor`: `ObjectId` → `Donor._id` (Indexed)
- `status`: `String` (Enum: `"pending" | "accepted" | "declined" | "expired" | "completed"`, Indexed)
- `score`: `Number` (Computed compatibility priority score)
- `respondedAt`: `Date` (Timestamp of donor response)
- **Indexes**: `{ bloodRequest: 1 }`, `{ donor: 1 }`, `{ status: 1 }`

---

### 5. `userpreferences` (`UserPreferences.ts`)
User settings and notification channel toggles.
- `_id`: `ObjectId` (Primary Key)
- `userId`: `ObjectId` → `User._id` (Unique, Indexed)
- `emergencyAlerts`: `Boolean` (Default: `true`)
- `donationReminders`: `Boolean` (Default: `true`)
- `newMessages`: `Boolean` (Default: `true`)
- `trustUpdates`: `Boolean` (Default: `false`)
- `blogUpdates`: `Boolean` (Default: `false`)
- `showProfile`: `Boolean` (Default: `true`)
- `shareLocation`: `Boolean` (Default: `true`)
- `allowDirectMessages`: `Boolean` (Default: `false`)

---

### 6. `notifications` (`Notification.ts`)
In-app alert notifications for emergency matches and system updates.
- `_id`: `ObjectId` (Primary Key)
- `userId`: `ObjectId` → `User._id` (Indexed)
- `type`: `String` (`"emergency" | "match_accepted" | "eligibility" | "message" | "trust" | "blood_needed" | "system"`)
- `title`: `String`
- `message`: `String`
- `read`: `Boolean` (Default: `false`)
- `bloodRequestId`: `String` (Optional)
- `matchId`: `String` (Optional)

---

## ⚡ Performance & Indexing Strategy

To guarantee sub-50ms query latency under heavy search load:
1. **Geospatial Proximity**: Both `Donor.location` and `BloodRequest.geoLocation` use 2dsphere spatial indexes to execute fast spherical distance queries (`$near`, `$geoWithin`).
2. **Compound Filtering**: Frequent queries such as finding nearby compatible donors of a specific blood group leverage indexed fields (`bloodType`, `status`, `urgencyLevel`).
3. **Write Isolation**: Mongoose handles transactional writes, encryption hooks, and schema validation.
