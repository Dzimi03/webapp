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
  - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: From Upstash Redis (required in production)
  - `BLOB_READ_WRITE_TOKEN` (optional): Only needed for local dev writes to Vercel Blob

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
UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token
# Optional for local dev with Vercel Blob uploads
BLOB_READ_WRITE_TOKEN=your-vercel-blob-read-write-token
```

## Avatar uploads with Vercel Blob

This app stores user avatar images in Vercel Blob when deployed to Vercel (serverless file system is read‑only). Locally it falls back to writing into `public/uploads` unless a Blob token is provided.

- Production (Vercel):
  1) Connect your project to Vercel Blob in the Vercel dashboard: Storage → Blob → Connect to Project.
  2) No token needed at runtime on Vercel; the integration provides credentials.

- Local development (optional Blob writes):
  1) Go to Vercel → Storage → Blob → your store → Settings → Tokens → Generate Read‑Write Token.
  2) Put it into your `.env.local` as `BLOB_READ_WRITE_TOKEN=...`.
  3) Restart `npm run dev`.

If you don't set the token locally, uploads will be saved to `public/uploads` instead. In production we always prefer Blob storage.

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
