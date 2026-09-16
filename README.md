# Captain's Log ⚓

A simple, single-user web app for logging daily boat activity: date, marina,
weather, engine hours, departure/arrival points, distance, duration, crew,
fuel added, oil checked, maintenance notes, general notes, and photos.

- **Frontend:** React + Vite
- **Backend:** Express + SQLite (via [libSQL](https://turso.tech/libsql), so it
  can run as a local file for development or a free hosted database in
  production)

## Project layout

```
captains-log/
  client/   React + Vite frontend
  server/   Express API + SQLite database
```

## Running it on your own computer

You'll need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
# from the captains-log folder
npm run install:all

# in one terminal
npm run dev:server

# in another terminal
npm run dev:client
```

Then open http://localhost:5173 in your browser. Your data is stored in
`server/data/captains-log.db` on your computer.

## Deploying for free so you can use it from your phone

This app is set up to deploy on **Render** (free web hosting, no credit
card needed) using **Turso** (a free hosted SQLite database) so your log
entries and photos are never lost. Full walkthrough is in the chat message
that came with this project, but the short version:

1. Create a free Turso database at [turso.tech](https://turso.tech) and
   copy its **Database URL** and **Auth Token**.
2. Create a free account at [render.com](https://render.com), connect your
   GitHub account, and create a **New Blueprint** pointing at this repo.
   Render will read `render.yaml` and set everything up automatically.
3. When asked, paste in `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
4. Render gives you a `https://your-app-name.onrender.com` link you can
   open on your phone and add to your home screen.

## Notes

- This app has no login — anyone with the link can view and edit it, which
  is fine for personal use but don't share the link publicly.
- The free Render plan "spins down" the server after 15 minutes of no
  visits and takes up to ~30-60 seconds to wake back up on the next visit.
  Your data is safe either way since it lives in Turso, not on Render's disk.
