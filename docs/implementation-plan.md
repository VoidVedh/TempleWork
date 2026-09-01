# 🚩 Master Implementation Plan — Ekdant Mitra Mandal / Shree Siddhivinayak Mandir

**Target Architecture:** Modern, Devotional, Community-Focused, Fast, Trustworthy, and Production-Ready Web Application.  
**Languages Supported:** Marathi (मराठी), English, Hindi (हिंदी).  

---

## 🎯 Architecture & Execution Roadmap

```
├── P0: Critical Foundation (Database Schema, Backend APIs, Security & RBAC)
├── P1: Core Product Features (Public Views, User Space, Admin Management, Multilingual)
└── P2: Enhancements, Quality & Verification (Calendar, Search, Visual & Load QA, Build)
```

---

## Phase P0 — Critical (Database Schema, Security, and Backend Services)

### Task P0.1: Database Schema Expansion
* **Objective**: Create normalized, relational tables for Events, Event Registrations, Announcements, Albums, Gallery Photos, and Notifications with indexes and foreign keys.
* **Files Affected**:
  - `server/src/config/database.js`
* **Schema Additions**:
  1. `events`: `(id, title_en, title_mr, title_hi, description_en, description_mr, description_hi, date, start_time, end_time, venue_en, venue_mr, venue_hi, map_url, organizer, status, capacity, registered_count, banner_image_url, created_at, updated_at)`
  2. `event_registrations`: `(id, event_id, user_id, attendee_name, attendee_mobile, attendee_email, guests_count, status, qr_code_token, created_at)`
  3. `announcements`: `(id, title_en, title_mr, title_hi, content_en, content_mr, content_hi, priority, status, expiry_date, author_id, author_name, related_event_id, created_at)`
  4. `albums`: `(id, title_en, title_mr, title_hi, description_en, description_mr, category, cover_image_url, year, sort_order, created_at)`
  5. `gallery_photos`: `(id, album_id, title_en, title_mr, image_url, thumbnail_url, caption_en, caption_mr, date_taken, sort_order, created_at)`
  6. `notifications`: `(id, user_id, type, title_en, title_mr, title_hi, message_en, message_mr, message_hi, link, is_read, created_at)`
* **Verification**: Run database initialization and test table creation via sqlite query.

### Task P0.2: Granular Role-Based Access Control (RBAC) & Enhanced Upload Security
* **Objective**: Update auth middleware with hierarchical/granular roles (`SUPER_ADMIN`, `ADMIN`, `EVENT_MANAGER`, `CONTENT_MANAGER`, `TREASURER`, `VIEW_ONLY`, `MEMBER`) and enforce strict MIME/extension checking in upload middleware.
* **Files Affected**:
  - `server/src/middlewares/authMiddleware.js`
  - `server/src/middlewares/uploadMiddleware.js`
* **Verification**: Run security payment test and verify role restriction rejections.

### Task P0.3: Backend Controllers & REST APIs
* **Objective**: Implement comprehensive, validated CRUD and public query controllers.
* **New Files**:
  - `server/src/controllers/eventController.js` (list, get by ID, create, update, delete, register, cancel registration)
  - `server/src/controllers/announcementController.js` (public list, get, admin create, update, delete)
  - `server/src/controllers/galleryController.js` (public albums & photos with filtering, admin upload & manage)
  - `server/src/controllers/notificationController.js` (user notifications, mark read, create system notification)
* **Updated Files**:
  - `server/src/index.js` (mount routes)
* **Verification**: Automated curl & test scripts for all new routes.

---

## Phase P1 — Important (Modern UI/UX, Public Pages, User & Admin Suite)

### Task P1.1: Design System & Navigation Architecture
* **Objective**: Create clean, responsive navigation with client-side deep-link routing (`/`, `/events`, `/events/:id`, `/gallery`, `/announcements`, `/contribute`, `/about`, `/contact`, `/dashboard`, `/admin/*`) that syncs with browser history and supports direct sharing.
* **Files Affected**:
  - `client/src/App.jsx`
  - `client/src/components/layout/Navbar.jsx`
  - `client/src/components/layout/AppHeader.jsx`
  - `client/src/components/layout/Footer.jsx`
  - `client/src/styles/index.css`

### Task P1.2: Public Section Views
* **Objective**: Create modern, devotional, responsive public sections.
  1. **Home**: Hero section, live status, upcoming highlights, quick actions, mandal stats.
  2. **Events (`/events` & `/events/:id`)**: Filterable event cards (Upcoming, Live, Completed), state machine validation, registration modal with instant confirmation, venue directions, and calendar button.
  3. **Gallery (`/gallery` & `/gallery/:albumId`)**: Album cards, responsive photo grid, lazy loading, full-screen lightbox modal with keyboard navigation.
  4. **Announcements (`/announcements`)**: Filter by status (`NEW`, `IMPORTANT`, `UPDATED`), priority badges, event links.
  5. **Contribute (`/contribute`)**: Clear campaign cards, real-time UPI QR generation, UTR submission, transparent donor honor roll with privacy toggle.
  6. **About (`/about`) & Contact (`/contact`)**: Mandal history, trust registration details, executive committee, interactive location map, contact forms.
* **New Files**:
  - `client/src/views/EventsView.jsx`
  - `client/src/views/EventDetailModal.jsx`
  - `client/src/views/GalleryView.jsx`
  - `client/src/views/AnnouncementsView.jsx`
  - `client/src/views/AboutView.jsx`
  - `client/src/views/ContactView.jsx`

### Task P1.3: User Dashboard & Member Space
* **Objective**: Authenticated devotee & member portal showing personal contributions, official verified receipts, registered events, real notifications, and profile details.
* **New Files**:
  - `client/src/views/UserDashboardView.jsx`
  - `client/src/components/user/MyContributions.jsx`
  - `client/src/components/user/MyRegistrations.jsx`
  - `client/src/components/user/NotificationBell.jsx`

### Task P1.4: Administrative Management Suite
* **Objective**: Integrate full administrative controls for Events, Announcements, Gallery Albums & Photos alongside existing Receipts, Expenses, Members, and Audit Logs.
* **New/Updated Files**:
  - `client/src/views/AdminEventManagerView.jsx`
  - `client/src/views/AdminAnnouncementManagerView.jsx`
  - `client/src/views/AdminGalleryManagerView.jsx`
  - `client/src/views/DashboardView.jsx`
  - `client/src/components/layout/NavigationDrawer.jsx`

### Task P1.5: Multilingual Translations (Marathi, English, Hindi)
* **Objective**: Complete translation catalog for Marathi (`mr`), English (`en`), and Hindi (`hi`).
* **Files Affected**:
  - `client/src/i18n/translations.js`
  - `client/src/context/LanguageContext.jsx`

---

## Phase P2 — Enhancements & Production Verification

### Task P2.1: Calendar Integration (.ics / Google Calendar) & Social Sharing
* **Objective**: 1-click "Add to Calendar" for events (.ics file download and Google Calendar URL), and WhatsApp/Twitter share links.
* **Files Affected**:
  - `client/src/utils/calendarUtils.js`

### Task P2.2: Universal Search & Filter Engine
* **Objective**: Instant search bar across events, announcements, and albums with debounce.

### Task P2.3: Comprehensive Verification & Production Build
* **Objective**: Verify all screen resolutions (320px, 375px, 768px, 1024px, 1440px), browser subagent interaction tests, production bundle build (`npm run build`), server API tests, and generation of `docs/final-implementation-report.md`.
