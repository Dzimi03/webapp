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

## Deployment

### Option 1: Vercel (Recommended)

1. **Push your code to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy to Vercel**
- Go to [vercel.com](https://vercel.com)
- Sign up with GitHub
- Click "New Project"
- Import your repository
- Add environment variables:
  - `NEXTAUTH_URL`: Your Vercel URL (e.g., https://your-app.vercel.app)
  - `NEXTAUTH_SECRET`: Generate a random secret (e.g., `openssl rand -base64 32`)
  - `NEXT_PUBLIC_TICKETMASTER_API_KEY`: Your Ticketmaster API key (optional)

3. **Deploy**
- Vercel will automatically build and deploy your app
- Your app will be available at `https://your-app.vercel.app`

### Option 2: Netlify

1. **Build the app**
```bash
npm run build
```

2. **Deploy to Netlify**
- Go to [netlify.com](https://netlify.com)
- Drag and drop your `.next` folder
- Or connect your GitHub repository

### Option 3: Railway

1. **Push to GitHub**
2. **Connect to Railway**
- Go to [railway.app](https://railway.app)
- Connect your GitHub repository
- Add environment variables
- Deploy

## Environment Variables

Create a `.env.local` file with:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_TICKETMASTER_API_KEY=your-ticketmaster-api-key
```

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
