# Setting up accounts

Step one of centralising the planner: real sign-in, with roles that live on a
server instead of in a browser.

Nothing else moves yet. Projects, the team roster, the contact book and every
file are still stored on the device they were entered on — this only changes
**who someone is** and **what they are allowed to be**.

## What you have to do

### 1. Run the migration

In your Supabase project → **SQL Editor** → paste the whole of
`migrations/0001_auth_and_roles.sql` and run it. It creates:

- `profiles` — one row per account, with the role
- `invitations` — the addresses an admin has opened the door to
- Row-level security on both, so the browser cannot write a role
- A trigger that turns a sign-up into a profile, and rejects addresses nobody
  invited

### 2. Turn off open sign-ups

**Authentication → Sign In / Providers → Email**: leave Email enabled, and
under **Auth settings** turn **"Allow new users to sign up"** *on*.

That sounds backwards for an invite-only app. It isn't: the trigger is what
enforces invite-only, and it does so at the database rather than at the door,
so an uninvited sign-up fails whichever route it comes in by. Turning the
setting off would block invited people too.

Decide separately whether you want **"Confirm email"** on. On is safer; off is
one less step for a crew member with an address they rarely check.

### 3. Get the two values

**Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

The anon key is *meant* to be public — it identifies the project and nothing
more. Row-level security is what protects the data behind it. Never put the
**service_role** key anywhere near this app; it bypasses RLS entirely.

### 4. Run it locally

```
VITE_SUPABASE_URL=https://xxxx.supabase.co \
VITE_SUPABASE_ANON_KEY=eyJhbG... \
npm run dev
```

Or put them in a `.env.local` (already git-ignored) so you don't have to type
them each time.

### 5. Claim the first account

A brand new database has no admins, so nobody can issue the first invitation.
The trigger handles this: **the first person to sign up becomes the admin**,
and the door shuts behind them. So sign up as yourself, straight away, before
anyone else has the URL.

Check it worked: **Table Editor → profiles** should show one row with
`role = admin`.

### 6. Invite everyone else

In the app: **Settings → Access → Accounts**. Enter an address, pick a level,
Invite. Then tell them to open the app and use **Set Up Account** with that
address — nothing is emailed, because sending mail would need an edge function
holding a service key, which is a lot of machinery for a team of ten. Add it
later if the manual step grates.

### 7. Deploy

Add both values as repository secrets (**Settings → Secrets and variables →
Actions**) and pass them to the build step in `.github/workflows/deploy.yml`:

```yaml
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

Until you do this, the deployed site keeps running with no accounts at all —
see below.

## How the app behaves without this

**A build with neither variable set runs exactly as it always has**: no sign-in
screen, the access-level picker works off the passcodes in Settings, and
everything is on the device. That is deliberate — it means this change is safe
to merge and deploy before the Supabase side is ready, and it means a
standalone copy of the app still works.

The two paths differ only in where a level comes from:

| | No Supabase | With Supabase |
|---|---|---|
| Sign in | none | email + password |
| Level ceiling | none — any level reachable | the `role` on your account |
| Stepping up a level | the passcode from Settings | your account password |
| Stepping down | free | free |
| Settings → Access | Passcodes | Accounts |

## What this does and does not protect

**Does**: nobody can promote themselves. The role is a column behind RLS, and
the guard trigger rejects a role change from anyone who is not already an
admin. The old passcodes — shared secrets, in the clear, changeable by anyone
who reached Settings — are gone from the accounts build.

**Does not**: the project data itself. It is still in each browser's local
storage, so signing in as a Team Member on a device that already holds an
admin's projects does not hide those projects from a determined person with
devtools. That closes in the next step, when the data moves to the server and
gets RLS policies of its own. Until then, treat the level as it always was on
the data side — a working mode — while knowing the role itself is now real.

## Offline

The session is cached, so once someone has signed in on a device the app opens
offline as before. What now needs signal is the **first** sign-in on a device,
and stepping up a level (which re-checks the password). Worth knowing before a
job: get a new phone signed in at the office, not in the driveway.

---

# Sharing the data (step three)

Accounts were step one, the tables step two. This is the app actually using
them: projects, the team roster, the contact book and everything in Settings
live on the server and turn up on every device.

## Joining a device

Nothing syncs until somebody says which way the first sync runs, and the app
will not guess. Go to **Settings → Access → Sync** and pick one:

- **Upload this device to the server** — what is on this machine becomes the
  shared copy. Do this **once**, from whichever device holds the projects
  everyone should be working from. Usually the office computer.
- **Use the server's copy instead** — this device's shared data is replaced by
  what is already up there. This is what every other device does.

The guard exists because a pull replaces local storage wholesale. A device
holding a year of work, syncing for the first time against a server that is
still empty, would pull nothing over all of it and call that success. So the
first move is a decision, not a default.

Photos, floor plans and the furniture inventory are **not** part of this. They
stay on the device they were added to; moving them is a later step.

## What happens after that

Every save goes into local storage first, exactly as before — the app opens and
works with no signal, and nothing waits on the network. What changed is queued
and pushed a second or so later, and changes from anyone else arrive within a
second or two over a live connection, with a minute's poll behind it in case
that connection drops without saying so.

The queue survives closing the app. Eight edits to one shift are one push, not
eight, and the value sent is whatever local storage holds at the moment it
goes — the one the person last saw.

## When two people change the same thing

The app stops and asks rather than picking. Under **Settings → Access → Sync**
the clash is listed with both sides named and dated:

- **Keep mine** — this device's version overwrites the server's.
- **Take theirs** — this device's change is dropped and the server's copy comes
  down.

Nothing is pushed over and nothing is discarded until one of those is chosen,
and the rest of syncing waits while the question is open. A row deleted on the
server while this device was editing it counts as a clash too — recreating it
silently would undo a deliberate delete.

## Where to look when something seems wrong

The access control — bottom of the sidebar on a computer, **Menu → Access** on
a phone — shows a coloured line whenever sync needs attention: offline with
changes waiting, a clash to settle, or a device not joined yet. Nothing is
shown when it is simply working. **Settings → Access → Sync** has the detail
and a **Sync now** button.

Offline is not an error. The line says how many changes are waiting; they go up
on their own when the signal comes back.
