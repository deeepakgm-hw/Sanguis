# Judge Strategy

## Pitch structure (3 minutes)
1. **Problem** (20s) — one real stat or story, not a generic statement.
2. **Solution** (30s) — what it does, in plain language, no jargon.
3. **Live demo** (90s) — the ONE flow that matters, rehearsed, on a phone/screen you control.
4. **Architecture** (30s) — one diagram: client → API → DB/Redis, security layer called out.
5. **Impact + next steps** (20s) — who uses this, what's next after the hackathon.

## Demonstrating security (differentiator most teams skip)
- Say explicitly: "Passwords are hashed with Argon2id, not stored in plaintext."
- Say explicitly: "Access tokens are short-lived and never touch localStorage — refresh
  tokens are httpOnly cookies with rotation, so a stolen token can't be replayed."
- Show the `/admin/security` dashboard live if your problem statement has any auth surface.
- If asked "what if someone brute forces login" — you have a real answer: account lockout
  after 5 attempts, Redis-backed rate limiting.

## Demonstrating scalability
- Redis for rate limiting/caching means the API is stateless and horizontally scalable.
- MongoDB with proper indexes (shown in the model files) + connection pooling.
- Dockerized + Nginx reverse proxy — "this is one `docker compose up` from a second instance
  behind a load balancer."

## Explaining architecture concisely
Draw it as: Browser → Nginx → {Next.js frontend, Express API} → {MongoDB, Redis} → {Cloudinary,
Socket.IO}. One sentence per arrow. Don't over-explain — judges interrupt with questions.

## Handling technical questions
- If you don't know: "Good question — here's how I'd approach it," then reason out loud.
  Judges reward reasoning over memorized answers.
- Never argue with a judge's critique. Acknowledge the trade-off, state why you chose what
  you chose given the 8-hour constraint.

## If something breaks during the demo
- Have a 30-second pre-recorded backup clip of the working flow, ready to switch to.
- Narrate calmly: "Looks like the network dropped — let me show you the recorded run while
  this reconnects," and keep talking through the architecture instead of going silent.
