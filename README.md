# Club Connect IITR — Event Media Management Platform

A complete full-stack platform designed for club events and media organization. The app supports event creation, photo/video upload, role-based access, social interactions, AI-generated captions, analytics, and optional cloud storage.

## What This Project Solves

Club and student organizations often lose control of event media when files are scattered across personal phones, WhatsApp groups, Google Drive, and other platforms. This project brings everything together in one searchable, role-aware portal with event-wise albums, personalized discovery, and upload controls.

## Key Features

- Role-based access control for Admin, Photographer, Member, and Viewer
- Event creation and category-based albums
- Drag-and-drop upload of images and videos with preview
- Public/private media access per upload
- One-user-one-like behavior with like counts
- Favourite toggles and favorites panel
- Commenting and tagging with notifications
- AI-generated image captions and smart tag generation
- Advanced search by event, tags, uploader, date, and description
- Personalized face-match flow for reference selfies
- Dashboard analytics for media, likes, comments, favourites, uploads by role, top tags, and contributors
- Optional AWS S3 integration for storage
- Dynamic watermark downloads for media assets

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js built-in HTTP server
- Demo database: JSON file (`backend/server/data/database.json`)
- Production-ready schema: SQLite/PostgreSQL-style SQL in `required-deliverables/database/schema.sql`
- Optional cloud storage: AWS S3 via `@aws-sdk/client-s3`

## Repository Structure

```text
backend/server/index.js         # API server, RBAC, media upload, face-match, notifications
backend/server/data/database.json  # demo data store for users, events, media, notifications
frontend/client/index.html     # user interface, forms, panels, UI structure
frontend/client/styles.css     # styling, layout, responsive grid
frontend/client/app.js         # frontend state, rendering, API calls, feature behaviors
required-deliverables/database/schema.sql  # relational schema for production database
required-deliverables/docs/architecture.md # architecture diagram and flow description
required-deliverables/docs/demo-video-script.md # demo script outline
package.json                   # project metadata and dependencies
README.md                      # project documentation
```

## Setup and Run

1. Install Node.js (16+ recommended).
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm run dev
```

4. Open the app:

```text
http://localhost:3000
```

> The server serves the static frontend and API from the same Node.js process.

## Demo User Roles

The login widget uses a role selector, with demo sign-in data embedded in the JSON store.

| Role | Example User |
| --- | --- |
| Admin | `Aarav Mehta` |
| Photographer | `Nisha Rao` |
| Member | `Yuvraj Singh` |
| Viewer | `Guest Viewer` |

Roles included in the system:
- `admin`
- `photographer`
- `member`
- `viewer`

## API Summary

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/dashboard` | Returns app state, events, visible media, analytics, users, and notifications |
| GET | `/api/search?q=` | Searches media by event, tags, uploader, date, description, and caption |
| POST | `/api/events` | Create a new event (admin/photographer/member) |
| POST | `/api/media` | Upload media files and save metadata |
| POST | `/api/media/:id/like` | Toggle like on media and notify owner |
| POST | `/api/media/:id/comment` | Add or update comment on media |
| POST | `/api/media/:id/favourite` | Toggle favourite status |
| POST | `/api/media/:id/caption` | Generate or refresh an AI-style caption |
| POST | `/api/face-match` | Demo face-match search by reference selfie metadata |
| GET | `/api/media/:id/download` | Download media preview with watermark text |
| POST | `/api/notifications/read-all` | Mark notifications as read |

## Database Schema

The relational schema for production-ready storage is available in `required-deliverables/database/schema.sql`.

Key tables:
- `users` — authenticated roles and profile metadata
- `events` — event albums, categories, access level, and cover metadata
- `media_items` — uploaded photos/videos, storage references, captions, visibility, and uploader
- `media_tags` — smart tags extracted from file names, event context, and description
- `likes` — per-user likes for one-like-per-user behavior
- `favourites` — per-user favourites list
- `comments` — threaded media comments
- `user_tags` — tagged user references on media
- `face_references` — selfie reference records for face-match workflows
- `notifications` — inbox feed for likes, comments, and tags

## Architecture Overview

The app is built as a simple client-server web app with the following flows:

1. The browser loads the static frontend from Node.js.
2. The frontend authenticates via a demo role selector and keeps the `userId` in local state.
3. The browser requests `/api/dashboard` to fetch events, media, analytics, and notifications.
4. Media upload requests are sent to `/api/media` and saved to the JSON store or optionally uploaded to S3.
5. Social actions generate notifications and update the demo database.
6. The analytics dashboard is computed on demand by the backend from visible media.

The architecture file in `required-deliverables/docs/architecture.md` includes a Mermaid diagram of the data flow.

## Production Notes

- Replace `backend/server/data/database.json` with a real database using the provided SQL schema.
- Use AWS S3 or another object store for media files instead of embedded data URLs.
- Use a secure authentication system instead of role selector/demo login.
- Add WebSocket or server-sent events for true real-time notifications.

## Optional AWS S3 Integration

To enable AWS S3 uploads:
1. Copy `.env.example` to `.env`.
2. Fill in `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.
3. Start the app with `npm run dev`.

When configured, the backend uploads media to S3 and labels records with `storageProvider: AWS S3`.

## For Judges and Reviewers

This repo is structured to demonstrate end-to-end capabilities for a club media platform, from event creation and upload UX to RBAC, social interactions, AI captioning, analytics, notifications, and scalable storage planning.

### Deliverables in this repo
- `README.md` — complete project documentation
- `required-deliverables/database/schema.sql` — production schema
- `required-deliverables/docs/architecture.md` — system architecture design
- `required-deliverables/docs/demo-video-script.md` — demo script outline
