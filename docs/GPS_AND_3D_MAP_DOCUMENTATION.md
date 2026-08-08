# SANGUIS — REAL-TIME BLOOD DONOR GPS + 3D MAP DOCUMENTATION

## 1. How GPS is Obtained
Device location is obtained directly from the browser's native **Geolocation API** via `navigator.geolocation.watchPosition()` with high accuracy enabled (`enableHighAccuracy: true`, `maximumAge: 3000`, `timeout: 10000`).
*The browser/device Geolocation API is the single source of truth for GPS coordinates. No IP geolocation or fabricated coordinates are used.*

> **Notice:** GPS accuracy depends on the device, environment, permissions, and available positioning signals. The application uses the browser-reported accuracy value and does not guarantee a fixed physical accuracy.

## 2. Browser Permission Requirements
- **Opt-In Consent**: Location tracking requires explicit user opt-in ("Share Live Location").
- **Secure Context**: Web browser Geolocation requires HTTPS in production (or localhost/127.0.0.1 in development).
- **Error Handling**: Gracefully handles `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, and `TIMEOUT` without crashing.

## 3. GPS Accuracy Classification
GPS accuracy is measured in meters (`position.coords.accuracy`):
- **EXCELLENT**: <= 10m
- **GOOD**: > 10m && <= 30m
- **ACCEPTABLE**: > 30m && <= 50m
- **POOR**: > 50m && <= 100m
- **VERY_POOR**: > 100m

*Configurable threshold:* `GPS_MAX_MATCHING_ACCURACY_METERS = 50`. Locations with accuracy > 50 meters are flagged as "Approximate" and excluded from precise emergency donor matching.

## 4. Location Update Frequency Policy
Updates are throttled to save battery and reduce socket overhead:
- **NORMAL MODE**: Minimum movement: 25 meters, Maximum interval: 15 seconds.
- **EMERGENCY MODE**: Minimum movement: 5 meters, Maximum interval: 3 seconds.

## 5. Socket.IO Event Contract
- `donor:location:start`: Initiates live location sharing session.
- `donor:location:update`: Transmits `{ latitude, longitude, accuracy, heading, speed, timestamp, bloodType }`.
- `donor:location:stop`: Stops tracking and removes live record.
- **Emits on server**: `donor:location_started`, `donor:location_updated`, `donor:location_stopped` on the `live-dispatch` room.
- *Security*: The server derives `donorId` strictly from the authenticated Socket.IO session token (`socket.data.user.sub`), preventing donor identity spoofing.

## 6. Redis GEO Infrastructure
- **Redis GEO Key**: `sanguis:donors:locations`
- **Redis Metadata Key**: `sanguis:donors:meta:<donorId>`
- Nearby donor matching executes using Redis `GEORADIUS` / `GEOSEARCH` commands.

## 7. Location Freshness Rules
- **LIVE**: Last updated <= 30 seconds ago.
- **RECENT**: Updated 30–120 seconds ago.
- **STALE**: Older than 120 seconds. Stale records are excluded from live emergency matching.

## 8. Map Renderer & 3D Presentation
- Rendered via interactive Leaflet map layer with CartoDB Voyager tiles (free/open attribution compliant tile provider).
- **3D Perspective View**: Supports pitch tilt (45°), bearing rotation, 2D/3D toggle, smooth animated marker updates, and camera recentering.

## 9. Privacy & Authorization
- Exact donor coordinates are NEVER publicly exposed or logged in production.
- Donors see their own live position (📍).
- Authorized hospital/emergency requesters receive proximity distance and match telemetry for active emergency requests.

## 10. Real Phone Testing Guide
1. Open Sanguis application on mobile device browser.
2. Sign in as a registered donor.
3. Open **Donor Dashboard**.
4. Tap **Share Live Location** and grant location permissions when prompted.
5. Verify live accuracy pill (e.g., `Accuracy: 9m`) and quality badge.
6. Walk/move with device to observe live coordinate and marker updates.
7. Tap **Stop Sharing** to instantly revoke live tracking and expire Redis GEO records.
