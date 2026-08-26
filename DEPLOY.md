# Deploying PathSeeker to Vercel

The repository is ready to deploy. Two things cannot be done for you,
because both need your own login: creating the database and connecting the
repository to Vercel. Everything else is already configured.

Total time is about ten minutes, and both services are free at this size.

---

## 1. Create the database (about 5 minutes)

The app currently runs on `mongodb-memory-server`, which lives inside the
Node process and starts empty every time it restarts. That is why accounts
keep disappearing locally — it is not a bug, it is what an in-memory
database does. A deployment needs a real one.

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>
2. Create a **free M0 cluster** (any region; pick the one nearest Karachi)
3. **Database Access** → add a user, and note the password
4. **Network Access** → Add IP Address → **Allow access from anywhere**
   (`0.0.0.0/0`)

   Vercel functions do not have fixed IP addresses, so an allowlist cannot
   work. The database is still protected by its username and password.
5. **Connect** → **Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `PASSWORD` with the password from step 3.

---

## 2. Deploy (about 5 minutes)

1. Go to <https://vercel.com/new> and sign in with GitHub
2. Import **hamzaharoonk07-cloud/careerpassport**
3. Leave the framework preset alone — `vercel.json` already describes the
   build
4. Open **Environment Variables** and add these five:

   | Name | Value |
   | --- | --- |
   | `MONGO_URI` | the string from step 1.5 |
   | `JWT_ACCESS_SECRET` | see below |
   | `JWT_REFRESH_SECRET` | see below (must differ from the access secret) |
   | `NODE_ENV` | `production` |
   | `ADMIN_EMAILS` | `hamzaharoonk07@gmail.com` |

   Generate each secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Do not reuse the values from `server/.env`. Those have been on a
   development machine and in a terminal history; a deployment should start
   with secrets that have never left it.

5. **Deploy.**

---

## 3. Seed the live database

The deployed app will not seed itself. Seeding a real cluster is deliberate
rather than automatic — an app that reseeds on boot can overwrite live data.

Run it once from your machine, pointed at the live database:

```bash
cd server
MONGO_URI="<your Atlas string>" npm run seed
```

That writes the six fields, the careers, the quiz questions with all three
phrasings of each, the success stories, and the demo and admin accounts.

---

## What you get

- `https://<project>.vercel.app` — the site, reachable from any phone on any
  network, which is the problem this solves
- `https://<project>.vercel.app/api/...` — the same Express app, running as a
  serverless function
- Automatic redeployment on every push to `main`

## Notes

**Accounts persist now.** The recurring "account not logging in" was the
in-memory database being wiped whenever the server restarted. With Atlas,
registrations survive.

**Cookies work unchanged.** The site and API share an origin on Vercel, so
the httpOnly cookies are same-origin exactly as they are behind the dev
proxy. `secure` and `sameSite: strict` switch on automatically because
`NODE_ENV` is `production`.

**Password reset prints to the log.** There is no mail service wired up, so
the six-digit code is written to the server log in development and nowhere
in production. Before anyone outside the team uses reset, connect a mail
provider at the marked place in `server/src/controllers/auth.controller.js`.

**Change the seeded admin password.** `admin@pathseeker.app` / `admin1234`
is in the repository, and the repository is public. Change it, or delete
that account, before the site is public.

**Video is about 19 MB.** Vercel serves it from its edge and the files are
cached immutably, so it is paid for once per region rather than per visit.

## If the build fails with "Missing script: vercel-build"

Vercel's **Root Directory** is set to a subfolder. Settings → Build and
Deployment → Root Directory must be empty (`./`), not `client`.

With it set to `client`, Vercel treats that folder as the whole
repository: `client/dist` resolves to `client/client/dist` and every route
404s, `api/` sits outside the root so the backend never deploys, and the
root `vercel.json` is never read.
