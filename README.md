# KAMPASS — Digital Simulation Platform for Strategic Key Account Management (KAM)

Developed by **LDL hub**.

KAMPASS is an enterprise simulation platform designed for executive training cohorts and KAM teams. It simulates competitive corporate account management across 8 quarters, dynamic stakeholder influence networks, perception ceilings, competitive counter-moves (Fedora competitor), and multi-team bidding & negotiation scenarios.

---

## 🔒 Security & Architecture Overview

KAMPASS implements an enterprise security hardening architecture:

1. **Authentication & Password Security**:
   - Facilitator accounts require passwords of 10+ characters.
   - Passwords hashed using Node.js `crypto.scrypt` with random 16-byte cryptographic salts and verified using constant-time comparison (`crypto.timingSafeEqual`).
   - httpOnly, SameSite=Lax, Secure cookies (`kampass_token`) storing signed JWTs (`8h` duration by default, extendable to `30d` with opt-in "Remember Me").

2. **Facilitator Ownership & Access Control**:
   - Facilitator routes require authenticated token with `facilitator` role.
   - Facilitators can only read, execute commands on, and delete sessions they created (`session.facilitatorId === token.sub`). Non-owned sessions return `404 Not Found` to prevent metadata leakage.
   - Sessions are updated strictly through authoritative command endpoints (quarter state transitions, resolution, timer, scoring) — bulk overwrite (`PUT` whole session) is prohibited.

3. **Participant Access & Hidden-State Protection**:
   - Trainees join cohorts via session codes (PINs) through `POST /api/sessions/join`.
   - Participants receive an isolated JWT token (12-hour session lifetime, stored in tab-scoped `sessionStorage`).
   - Server-side projection (`projectForParticipant`) strips all sensitive simulation state before responses leave the backend:
     - No other teams' detailed accounts or private financial resources.
     - Competitor (Fedora) internal targets, moves, and logic are concealed.
     - Raw perception numbers (`0-100`) and numerical ceilings are transformed into qualitative relationship states (`Cold`, `Neutral`, `Warm`, `Ally`) and named ladder levels (`Commodity Broker` -> `Business Partner`).
     - Unrevealed stakeholders and business priorities remain hidden until discovered.
   - Resource spending and game rules are recomputed and enforced authoritatively on the server; client costs are ignored.

4. **Real-Time WebSocket Synchronization**:
   - Real-time updates over `/ws` require authenticated tokens.
   - Sockets are partitioned by role: Facilitators receive the authoritative session model; Trainees receive exclusively their team's projected representation.

5. **Single Authoritative Data Store & Persistence**:
   - Single authoritative backend: Express + Cloud Firestore via Firebase Admin SDK.
   - All mutations execute inside atomic transactions (`firestore.runTransaction`) with optimistic concurrency version control.
   - Zero direct client-side reads/writes: browser clients only communicate with Express API endpoints.
   - In-process WebSocket fan-out: Real-time broadcast after committed transactions is in-process, so Cloud Run must be deployed with `--max-instances=1` (or add a Pub/Sub Redis adapter for multi-instance horizontal scaling).

---

## ⚙️ Environment Variables

Configure the following environment variables (e.g. in `.env` or container runtime):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the HTTP server listens on | `3000` |
| `NODE_ENV` | Runtime environment (`production` or `development`) | `development` |
| `FIREBASE_PROJECT_ID` | Google Cloud / Firebase Project ID | `kampass-c894f` |
| `FIRESTORE_DATABASE_ID` | Named Firestore database ID | `ai-studio-kampasskambusine-97bb179c-5fbc-483d-a6ef-dd04f5898189` |
| `JWT_SECRET` | Secret key for signing facilitator and participant JWTs (**Mandatory** in production) | Random per process in dev |

> ⚠️ **Cloud Run Deployment Note:**
> Because WebSocket fan-out is maintained in-process, deploy Cloud Run service with `--max-instances=1` to ensure all connected facilitator and participant sockets share the same active server process. On Cloud Run, Google Application Default Credentials (ADC) are used automatically.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
# Install dependencies
npm install
```

### Development
```bash
# Start development server with HMR and Express backend
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### Production Build & Execution
```bash
# Build the client bundle
npm run build

# Start production server
npm start
```

### Running Tests & Linting
```bash
# Run Vitest test suite (Simulation engine + Security & integration tests)
npm test

# Run TypeScript type check
npm run lint
```
