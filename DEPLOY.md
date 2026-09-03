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
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | your Gmail address |
   | `SMTP_PASS` | the App Password from step 3 below |
   | `MAIL_FROM` | the same Gmail address |

   Without the last five, the app runs fine but the password reset code is
   never delivered — it is written to the function log instead, and the log
   says so.

   Generate each secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Do not reuse the values from `server/.env`. Those have been on a
   development machine and in a terminal history; a deployment should start
   with secrets that have never left it.

### Getting the mail password (about 3 minutes)

Gmail will not accept your normal password from an application. You need a
16-character **App Password**, and that needs 2-step verification switched on
first.

1. Turn on 2-step verification at <https://myaccount.google.com/security>
2. Go to <https://myaccount.google.com/apppasswords>
3. Name it anything — "PathSeeker" — and copy the 16 characters it shows.
   Paste them into `SMTP_PASS` **without the spaces**. Google shows the code
   once and never again.

Then check it before you rely on it:

```bash
node server/tools/mail-check.mjs                  # settings and login
node server/tools/mail-check.mjs you@gmail.com    # ...and send a real one
```

It names the part that is wrong rather than leaving you to guess. The reset
endpoint cannot do that — it answers identically whatever happens, so that
nobody can use it to discover which addresses are registered — which is
exactly why this script exists separately.

Any SMTP provider works, not just Gmail — the four values point at whichever
one you use. Brevo and Resend are the usual alternatives if Gmail's ~500
messages a day is ever a limit, which at this size it will not be.

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

**Video is about 38 MB on disk, but no visitor downloads that.** Roughly 13 MB
of it is the `-2k` tier: 1440p cuts of the ten background plates, fetched only
by displays with more than 2000 physical pixels across and never on a
Save-Data or slow connection. A 1080p laptop or any phone pulls the same
~25 MB of 1080p and WebM the site has always shipped, and only ever the
handful of clips on the pages it actually visits. Vercel serves all of it from
its edge, cached immutably, so each file is paid for once per region rather
than per visit.

## If the build fails with "Missing script: vercel-build"

Vercel's **Root Directory** is set to a subfolder. Settings → Build and
Deployment → Root Directory must be empty (`./`), not `client`.

With it set to `client`, Vercel treats that folder as the whole
repository: the build output resolves one level too deep and every route
404s, `api/` sits outside the root so the backend never deploys, and the
root `vercel.json` is never read.

## If seeding fails with `querySrv ECONNREFUSED`

The `mongodb+srv://` scheme resolves the cluster through a DNS SRV record,
and some ISP resolvers never answer that query. It is not a credential or
firewall problem, and the same string works fine from Vercel.

Point Node at a public resolver for the run:

```bash
cat > dnsfix.mjs <<'EOF'
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
EOF
NODE_OPTIONS="--import ./dnsfix.mjs" MONGO_URI="<your Atlas string>" npm run seed
```

## The built-in admin account is not seeded in production

`admin@pathseeker.app` / `admin1234` is created only outside production,
because that password is in `seed.js` and this repository is public.

On a live database, seed.js skips it and administrators come from
`ADMIN_EMAILS` — register normally with a listed address and the role is
granted on registration — or from `OWNER_EMAIL` / `OWNER_PASSWORD`, which
are read from the environment rather than from a committed file.
