# 🛠️ SistemGaraj

**A modern Turkish PC hardware configurator, build sharing, and tech community platform.**

SistemGaraj enables users to assemble custom PC builds with a real-time compatibility engine, showcase their rigs, explore community configurations, and interact with fellow tech enthusiasts.

---

## ✨ Key Features

### 🔧 Compatibility Engine

- **Socket & Chipset Verification:** Automatic socket checking for CPUs and Motherboards (e.g., AM5, AM4, LGA1700).
- **Memory Generation Matching:** DDR4 / DDR5 motherboard and RAM compatibility validation.
- **Power Budget Calculator:** Smart PSU wattage sufficiency check featuring a 20% safety headroom margin.
- **Form Factor Validation:** Physical dimension and expansion alignment across cases and components.
- **Interactive Picker:** Incompatible hardware options automatically dim or lock during the build process.

### 👤 User Profiles & Community

- **Custom Profile Hub:** Showcase user-curated builds with personal avatars and cover banners.
- **Profile Wall:** Interactive guestbook/wall on user profile pages for community messages.
- **Build Showcase:** Share, discover, like, and comment on PC configurations with dynamic image galleries.
- **Featured Systems:** Editor-picked builds highlighted on the landing page.
- **Smart Content Moderation:** Banned-word filter, automated approval queue, and anti-spam timeout protections.

### 🛡️ Admin Dashboard

- **Role-Based Access Control (RBAC):** `User`, `Moderator`, and `Admin` permissions.
- **User Management:** Temporary muting and permanent banning system.
- **Moderation Queue:** Approve, reject, or delete submitted builds and comments.
- **Activity Tracking:** Comprehensive logs for user interactions, likes, and feedback.

### 🔐 Authentication & Security

- JWT-based authentication flow with HTTP-only tokens and `bcrypt` password hashing.

---

## 🧱 Tech Stack

### Frontend

- **Framework:** Next.js 15 (App Router, Client & Server Components)
- **Styling:** Tailwind CSS 4 with custom CSS variables (`@theme`)
- **Language:** TypeScript
- **UI Architecture:** Floating island layout, glassmorphism, responsive bento grids

### Backend

- **Runtime:** Node.js + Express 5
- **Database:** PostgreSQL 16
- **ORM:** Prisma 6
- **Authentication:** JWT (JSON Web Tokens) + `bcryptjs`

---

## 📁 Repository Structure

```text
SistemGaraj/
├── src/                    # Express backend source code
│   ├── routes/             # API endpoints (auth, builds, admin, components)
│   ├── middleware/         # Auth, validation & moderation middlewares
│   ├── services/           # Compatibility algorithms & moderation logic
│   └── index.ts            # Express server entry point
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Initial component data seeder
├── frontend/               # Next.js frontend application
│   └── src/
│       ├── app/            # App Router pages (feed, build-topla, profiles, auth)
│       ├── components/     # Reusable UI components & modals
│       └── lib/            # API client, types & AuthContext
└── requests.http           # REST Client API test requests
```

# 🛠️ SistemGaraj

**A modern Turkish PC hardware configurator, build sharing, and tech community platform.**

SistemGaraj enables users to assemble custom PC builds with a real-time compatibility engine, showcase their rigs, explore community configurations, and interact with fellow tech enthusiasts.

---

## ✨ Key Features

### 🔧 Compatibility Engine

- **Socket & Chipset Verification:** Automatic socket checking for CPUs and Motherboards (e.g., AM5, AM4, LGA1700).
- **Memory Generation Matching:** DDR4 / DDR5 motherboard and RAM compatibility validation.
- **Power Budget Calculator:** Smart PSU wattage sufficiency check featuring a 20% safety headroom margin.
- **Form Factor Validation:** Physical dimension and expansion alignment across cases and components.
- **Interactive Picker:** Incompatible hardware options automatically dim or lock during the build process.

### 👤 User Profiles & Community

- **Custom Profile Hub:** Showcase user-curated builds with personal avatars and cover banners.
- **Profile Wall:** Interactive guestbook/wall on user profile pages for community messages.
- **Build Showcase:** Share, discover, like, and comment on PC configurations with dynamic image galleries.
- **Featured Systems:** Editor-picked builds highlighted on the landing page.
- **Smart Content Moderation:** Banned-word filter, automated approval queue, and anti-spam timeout protections.

### 🛡️ Admin Dashboard

- **Role-Based Access Control (RBAC):** `User`, `Moderator`, and `Admin` permissions.
- **User Management:** Temporary muting and permanent banning system.
- **Moderation Queue:** Approve, reject, or delete submitted builds and comments.
- **Activity Tracking:** Comprehensive logs for user interactions, likes, and feedback.

### 🔐 Authentication & Security

- JWT-based authentication flow with HTTP-only tokens and `bcrypt` password hashing.

---

## 🧱 Tech Stack

### Frontend

- **Framework:** Next.js 15 (App Router, Client & Server Components)
- **Styling:** Tailwind CSS 4 with custom CSS variables (`@theme`)
- **Language:** TypeScript
- **UI Architecture:** Floating island layout, glassmorphism, responsive bento grids

### Backend

- **Runtime:** Node.js + Express 5
- **Database:** PostgreSQL 16
- **ORM:** Prisma 6
- **Authentication:** JWT (JSON Web Tokens) + `bcryptjs`

---

## 📁 Repository Structure

```text
SistemGaraj/
├── src/                    # Express backend source code
│   ├── routes/             # API endpoints (auth, builds, admin, components)
│   ├── middleware/         # Auth, validation & moderation middlewares
│   ├── services/           # Compatibility algorithms & moderation logic
│   └── index.ts            # Express server entry point
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Initial component data seeder
├── frontend/               # Next.js frontend application
│   └── src/
│       ├── app/            # App Router pages (feed, build-topla, profiles, auth)
│       ├── components/     # Reusable UI components & modals
│       └── lib/            # API client, types & AuthContext
└── requests.http           # REST Client API test requests
```
