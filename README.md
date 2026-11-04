# Kolehiyo ng Heneral Santos — School Website

Plain **HTML + CSS + JavaScript** (no frameworks, no build step, nothing to install).
Includes an **online application form**, a **contact/inquiry form**, and a password-protected
**Admin Portal** where staff can monitor everyone who submits a form **and edit the website
(photos, courses, bulletin, contact details, about text) without touching any code**.

## Quick start in VS Code

You can run it two ways. Pick one.

### Option A — Real mode (recommended): `node server.js`
Needs only [Node.js](https://nodejs.org) 16 or newer (no `npm install`).

1. Open this folder in VS Code (**File → Open Folder**).
2. Open the terminal (**Terminal → New Terminal**) and run:
   ```
   node server.js
   ```
   (or `npm start`)
3. Open **http://localhost:3000** in your browser.

Form submissions from **every visitor** are saved to `data/submissions.json`
and appear in the admin dashboard. This is the mode to use for the real school website.

### Option B — Demo mode: Live Server (or double-click `index.html`)
1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` → **Open with Live Server**.

Everything works, **but** submissions are stored only in *that one browser*
(localStorage). Great for trying the site and the dashboard; it will not collect forms
from other people's devices. The dashboard shows a **"Demo · this browser"** badge so you always know.

## Admin Portal

Open **/admin.html** (also linked as "Staff login" in the footer).

* **First visit:** create the admin password (username is always `admin`, password min. 8 characters).
* After that, sign in with `admin` + your password.

The portal has six tabs:

| Tab | What you can do |
|-----|-----------------|
| **Submissions** | See everyone who filled in the application or contact form: totals, chart per program, search / filter / sort, open a submission, change its status, add private staff notes, reply by email, delete, **export CSV**. |
| **Photos** | Replace the **Home page banner** and the **Main campus photo** (used on Home and About). Saved instantly. |
| **Courses** | Edit every program: photo, name, web address, college, duration, short description, overview, highlights / subjects / careers (one per line). **+ Add course**, **Remove**, move up/down, then **Save courses**. |
| **Bulletin** | **+ New announcement**, edit date / tag / title / details, move up/down, remove, then **Save bulletin**. |
| **Contact** | Address, email, Facebook link, office hours and the list of offices (+ Add office), then **Save contact**. |
| **About** | Mission, Vision, Mandate, then **Save** (or **Reset to original text**). |

**Changes appear on the website automatically.** After you click Save, the public pages show the new
content on their next load, and pages that are already open update by themselves within ~30 seconds
(instantly if the site is open in another tab of the same browser). Nothing needs to be re-deployed.

Good to know:
* Photos are shrunk automatically (max 1600 px) so pages stay fast. JPG, PNG, WebP and GIF are accepted.
* Everything is checked on the server as well (valid email, safe links, unique course web addresses, etc.).
* Unsaved edits are kept when you switch tabs, and the browser warns you if you try to leave with unsaved changes.
* The 5 tabs that edit the website are stored in `data/content.json`; uploaded photos in `data/uploads/`.
* **Demo mode** (Live Server): the same editor works, but edits live only in that browser. Use `node server.js` for real use.
* To undo all edits: stop the server and delete `data/content.json` (the original texts from `js/data.js` come back).

Forgot the password (real mode)? Stop the server, delete `data/admin.json`, start again and
create a new one. Or start with `ADMIN_PASSWORD=yourpassword node server.js` the first time.
After a server restart you simply sign in again.

## Folder layout

```
index.html  about.html  programs.html  course.html
admissions.html   ← application form
contact.html      ← inquiry form
news.html
admin.html        ← login + dashboard
server.js         ← optional Node server (real mode)
css/styles.css  css/admin.css
js/data.js        ← the ORIGINAL website text (admin edits override it)
js/main.js  js/forms.js  js/store.js  js/admin.js  js/editor.js
images/           ← seal, favicon, course photos
data/             ← created automatically: submissions.json, admin.json,
                     content.json (admin edits), uploads/ (admin photos)
```

## Editing the website

* **Day-to-day changes** (photos, programs, announcements, contact info, mission/vision): use the **Admin Portal** tabs.
* **Things the portal does not edit** (admission steps, requirements, key dates, core values): edit `js/data.js`.
  Note: the *Key dates* there are still the original 2026 dates, so update them for the new school year.
* **Colors:** change the variables at the top of `css/styles.css` (`--navy`, `--gold`, …).

## Photos

The zip only contained the small 64 px logo, so:

* `images/seal.png` is currently that logo enlarged (slightly soft). Replace it with your **full-resolution seal** (keep the name `seal.png`).
* The **home banner** and **main campus photo** start empty (navy background). Upload them in **Admin Portal → Photos**.
* `images/favicon.png` is the browser-tab icon (already the school seal).

## Putting it online (real mode)

* Host `server.js` on any Node host (VPS, Render, Railway, etc.) and **put it behind HTTPS**
  — logins and applicant data must not travel over plain HTTP.
* Create the admin password **immediately** after the first deploy (the first person to open
  `/admin.html` can create it).
* **Back up `data/`** regularly (it holds applications, admin edits and uploaded photos). It contains applicants' personal information, so keep it private
  and follow the school's Data Privacy Act (RA 10173) procedures. `server.js` never serves the
  `data/` folder, and `.gitignore` keeps it out of git.
* Built-in protections: server-side input validation, hashed admin password (scrypt), 8-hour sessions,
  login lockout after 5 wrong attempts, rate-limited form submissions, spam trap field,
  CSV export guards against spreadsheet formula injection, and all submitted text is shown as plain text.

## What changed from the original (React/Supabase) project

* Rebuilt as static HTML/CSS/JS with the same design, pages and content.
* **New:** online application form, inquiry form, and the submissions dashboard.
* The original admin panel edited page text/images through Supabase. That cloud backend is not
  used here; the same editor (Photos / Courses / Bulletin / Contact / About) now saves to the
  built-in server (`data/content.json`, `data/uploads/`).
