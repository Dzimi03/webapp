# EventApp

A full-stack event planning app with user registration, authentication, friends, groups, events, budget planner, comments, and profile pages.

## Features
- User registration and login (NextAuth.js, credentials)
- Add and manage friends
- Create groups from friends
- Browse and select upcoming public events
- Create private events within a group
- Budget planner for events: total cost, split per person
- Comments/chat under events
- Profile page for each user
- Responsive UI (Tailwind CSS)
- Mock data and in-memory storage (lowdb, easy to upgrade)

## Tech Stack
- [Next.js](https://nextjs.org/) (App Router, API routes)
- [next-auth](https://next-auth.js.org/) (credentials provider)
- [lowdb](https://github.com/typicode/lowdb) (JSON file database)
- [Tailwind CSS](https://tailwindcss.com/)

## Getting Started

1. **Install dependencies**

```bash
npm install
```

2. **Seed the database with mock data**

```bash
# From the project root:
npx tsx src/app/api/seed.ts
```

3. **Run the development server**

```bash
npm run dev
```

4. **Open the app**

Visit [http://localhost:3000](http://localhost:3000)

## Main Pages
- `/login` — Login
- `/register` — Register
- `/profile` — User profile
- `/friends` — Manage friends
- `/groups` — Manage groups
- `/events` — Browse and create events

## Notes
- Uses mock/in-memory storage (`lowdb`). To upgrade to a real DB, replace lowdb with your preferred database.
- Default users: alice@example.com, bob@example.com, charlie@example.com (password: `password`)
- All code is in `/src/app` (API routes and pages)

---
MIT License
