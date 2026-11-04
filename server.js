/* ==========================================================
   Kolehiyo ng Heneral Santos — tiny web server
   ----------------------------------------------------------
   • Serves the website (html / css / js / images)
   • Saves form submissions to data/submissions.json
   • Protects the admin dashboard with a real server-side login
   • NO npm install needed — only Node.js 16 or newer.

   Run:   node server.js
   Open:  http://localhost:3000
   ========================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
const CONTENT_FILE = path.join(DATA_DIR, "content.json"); // website text/photos edited in the Admin Portal
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");        // photos uploaded from the Admin Portal
const CONTENT_KEYS = ["images", "courses", "news", "contact", "about"];
const ADMIN_USERNAME = "admin";
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
const STATUSES = ["new", "in-review", "contacted", "done"];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- tiny JSON "database" ---------- */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; }
}
function writeJson(file, value) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file); // atomic replace so the file is never half-written
}
function loadDb() {
  const db = readJson(SUBMISSIONS_FILE, null);
  if (db && Array.isArray(db.items)) {
    db.counter = db.counter || { application: 0, inquiry: 0 };
    return db;
  }
  return { counter: { application: 0, inquiry: 0 }, items: [] };
}

/* ---------- passwords & sessions ---------- */
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}
function checkPassword(password, rec) {
  if (!rec || !rec.salt || !rec.hash) return false;
  const a = Buffer.from(crypto.scryptSync(password, rec.salt, 64).toString("hex"));
  const b = Buffer.from(rec.hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sessions = new Map(); // token -> expiry time
function newSession() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_MS);
  return token;
}
function isAuthed(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const exp = sessions.get(token);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(token); return false; }
  return true;
}

// optional: ADMIN_PASSWORD=... node server.js  (creates the account on first start)
if (!fs.existsSync(ADMIN_FILE) && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8) {
  writeJson(ADMIN_FILE, hashPassword(process.env.ADMIN_PASSWORD));
  console.log("Admin account created from ADMIN_PASSWORD.");
}

/* ---------- simple rate limiting ---------- */
const hits = new Map(); // key -> [timestamps]
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { // keep the map small
  const now = Date.now();
  for (const [k, arr] of hits) { if (!arr.some((t) => now - t < 3600 * 1000)) hits.delete(k); }
  for (const [t, exp] of sessions) { if (exp < now) sessions.delete(t); }
}, 10 * 60 * 1000).unref();
const failedLogins = new Map(); // ip -> {count, until}

/* ---------- validation ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const SPEC = {
  application: {
    fullName: { req: true, min: 2, max: 120 },
    email: { req: true, max: 120, email: true },
    phone: { req: true, phone: true },
    birthdate: { req: true, date: true },
    address: { req: true, min: 3, max: 200 },
    lastSchool: { req: true, min: 2, max: 150 },
    program: { req: true, max: 100 },
    program2: { max: 100 },
    resident: { req: true, oneOf: ["Yes", "No"] },
    message: { max: 1000 },
    consent: { req: true, oneOf: ["Yes"] },
  },
  inquiry: {
    fullName: { req: true, min: 2, max: 120 },
    email: { req: true, max: 120, email: true },
    phone: { phone: true },
    office: { req: true, max: 100 },
    subject: { req: true, min: 2, max: 150 },
    message: { req: true, min: 5, max: 2000 },
  },
};
function cleanSubmission(type, input) {
  const spec = SPEC[type];
  if (!spec || !input || typeof input !== "object") return { error: "Invalid form." };
  const data = {};
  for (const [name, r] of Object.entries(spec)) {
    let v = input[name];
    v = typeof v === "string" ? v.trim() : "";
    if (!v) { if (r.req) return { error: `Missing required field: ${name}.` }; data[name] = ""; continue; }
    if (r.min && v.length < r.min) return { error: `${name} is too short.` };
    if (r.max && v.length > r.max) return { error: `${name} is too long.` };
    if (r.email && !EMAIL_RE.test(v)) return { error: "Please enter a valid email address." };
    if (r.phone && !PHONE_RE.test(v)) return { error: "Please enter a valid phone number." };
    if (r.oneOf && !r.oneOf.includes(v)) return { error: `Invalid value for ${name}.` };
    if (r.date) {
      const d = new Date(v);
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (isNaN(d.getTime()) || age < 14 || age > 90) return { error: "Please check your date of birth." };
    }
    data[name] = v;
  }
  return { data };
}

/* ---------- website content: validation ---------- */
function loadContent() {
  const c = readJson(CONTENT_FILE, null);
  if (c && c.content && typeof c.content === "object") return c;
  return { updatedAt: 0, content: {} };
}
const isStr = (v) => typeof v === "string";
function text(v, max, { req = false, label = "Field" } = {}) {
  if (v === undefined || v === null) v = "";
  if (!isStr(v)) throw new Error(`${label} must be text.`);
  v = v.replace(/\r\n/g, "\n").trim();
  if (req && !v) throw new Error(`${label} is required.`);
  if (v.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return v;
}
// Photos must be files on this site (images/... or uploads/...). Nothing else is accepted.
function imagePath(v, label) {
  v = text(v, 300, { label });
  if (v && (!/^(images|uploads)\/[A-Za-z0-9_\-./]+$/.test(v) || v.includes(".."))) throw new Error(`${label} is not a valid photo.`);
  return v;
}
function list(v, max, label) {
  if (!Array.isArray(v)) throw new Error(`${label} must be a list.`);
  if (v.length > max) throw new Error(`Too many items in ${label} (max ${max}).`);
  return v;
}
function lines(v, label) {
  return list(v, 30, label).map((x) => text(x, 200, { label })).filter(Boolean);
}

function cleanContent(key, v) {
  if (v === null || typeof v !== "object") throw new Error("Invalid data.");
  switch (key) {
    case "images":
      return { heroBg: imagePath(v.heroBg, "Home banner"), campusMain: imagePath(v.campusMain, "Main campus photo") };
    case "about":
      return {
        mission: text(v.mission, 1500, { req: true, label: "Mission" }),
        vision: text(v.vision, 1500, { req: true, label: "Vision" }),
        mandate: text(v.mandate, 1500, { req: true, label: "Mandate" }),
      };
    case "contact": {
      const email = text(v.email, 120, { req: true, label: "Email" });
      if (!EMAIL_RE.test(email)) throw new Error("Please enter a valid contact email.");
      const facebook = text(v.facebook, 300, { req: true, label: "Facebook link" });
      if (!/^https?:\/\/[^\s]+$/i.test(facebook)) throw new Error("Facebook link must start with http:// or https://");
      const offices = list(v.offices, 20, "Offices").map((o, i) => {
        if (o === null || typeof o !== "object") throw new Error("Invalid office.");
        const oe = text(o.email, 120, { label: `Office ${i + 1} email` });
        if (oe && !EMAIL_RE.test(oe)) throw new Error(`Office ${i + 1}: please enter a valid email.`);
        return { name: text(o.name, 100, { req: true, label: `Office ${i + 1} name` }), email: oe, phone: text(o.phone, 40, { label: `Office ${i + 1} phone` }) };
      });
      return { address: text(v.address, 300, { req: true, label: "Address" }), email, facebook, hours: text(v.hours, 300, { label: "Office hours" }), offices };
    }
    case "news":
      return list(v, 100, "Bulletin").map((n, i) => {
        if (n === null || typeof n !== "object") throw new Error("Invalid announcement.");
        return {
          date: text(n.date, 60, { req: true, label: `Announcement ${i + 1} date` }),
          tag: text(n.tag, 40, { label: `Announcement ${i + 1} tag` }),
          title: text(n.title, 200, { req: true, label: `Announcement ${i + 1} title` }),
          body: text(n.body, 2000, { label: `Announcement ${i + 1} details` }),
        };
      });
    case "courses": {
      const arr = list(v, 30, "Courses");
      if (arr.length < 1) throw new Error("Keep at least one course.");
      const seen = new Set();
      return arr.map((c, i) => {
        if (c === null || typeof c !== "object") throw new Error("Invalid course.");
        const slug = text(c.slug, 60, { req: true, label: `Course ${i + 1} web address` });
        if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`Course ${i + 1}: web address may only use lowercase letters, numbers and dashes.`);
        if (seen.has(slug)) throw new Error(`Two courses use the web address "${slug}". Each must be different.`);
        seen.add(slug);
        return {
          slug,
          name: text(c.name, 120, { req: true, label: `Course ${i + 1} name` }),
          short: text(c.short, 300, { label: `Course ${i + 1} short description` }),
          college: text(c.college, 120, { label: `Course ${i + 1} college` }),
          duration: text(c.duration, 60, { label: `Course ${i + 1} duration` }),
          image: imagePath(c.image, `Course ${i + 1} photo`),
          overview: text(c.overview, 3000, { label: `Course ${i + 1} overview` }),
          highlights: lines(c.highlights || [], `Course ${i + 1} highlights`),
          subjects: lines(c.subjects || [], `Course ${i + 1} subjects`),
          careers: lines(c.careers || [], `Course ${i + 1} careers`),
        };
      });
    }
  }
  throw new Error("Unknown section.");
}

// Photo uploads are checked by their real file signature, never by the name the browser claims.
function sniffImage(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 12 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.slice(0, 4).toString("ascii") === "GIF8") return "gif";
  if (buf.length > 12 && buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        if (chunks.length) { chunks.length = 0; reject(Object.assign(new Error("Photo is too large (max 10 MB)."), { status: 413 })); }
        return; // keep draining (and discarding) so the client can read our answer
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/* ---------- HTTP helpers ---------- */
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function readBody(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        if (chunks.length) { chunks.length = 0; reject(Object.assign(new Error("Request too large."), { status: 413 })); }
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (e) { reject(Object.assign(new Error("Invalid JSON."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function clientIp(req) { return req.socket.remoteAddress || "unknown"; }

/* ---------- API ---------- */
async function handleApi(req, res, pathname) {
  const method = req.method;

  if (pathname === "/api/health" && method === "GET") return send(res, 200, { ok: true });

  // public: the website reads its (admin-edited) text and photos from here
  if (pathname === "/api/content" && method === "GET") {
    const c = loadContent();
    return send(res, 200, { content: c.content, updatedAt: c.updatedAt });
  }

  // public: submit a form
  if (pathname === "/api/submissions" && method === "POST") {
    if (limited("submit:" + clientIp(req), 15, 60 * 60 * 1000)) return send(res, 429, { error: "Too many submissions. Please try again later." });
    const body = await readBody(req);
    const { data, error } = cleanSubmission(body.type, body.data);
    if (error) return send(res, 400, { error });
    const db = loadDb();
    db.counter[body.type] = (db.counter[body.type] || 0) + 1;
    const prefix = body.type === "application" ? "APP" : "INQ";
    const ref = `${prefix}-${new Date().getFullYear()}-${String(db.counter[body.type]).padStart(4, "0")}`;
    db.items.push({ id: crypto.randomBytes(8).toString("hex"), ref, type: body.type, status: "new", notes: "", createdAt: new Date().toISOString(), data });
    writeJson(SUBMISSIONS_FILE, db);
    return send(res, 201, { ok: true, ref });
  }

  // admin: is there an account yet?
  if (pathname === "/api/admin/status" && method === "GET") {
    return send(res, 200, { exists: fs.existsSync(ADMIN_FILE) });
  }

  // admin: one-time setup (only while no account exists)
  if (pathname === "/api/admin/setup" && method === "POST") {
    if (fs.existsSync(ADMIN_FILE)) return send(res, 409, { error: "Admin account already exists." });
    const body = await readBody(req);
    const pw = typeof body.password === "string" ? body.password : "";
    if (pw.length < 8 || pw.length > 72) return send(res, 400, { error: "Password must be 8–72 characters." });
    writeJson(ADMIN_FILE, hashPassword(pw));
    return send(res, 201, { ok: true, token: newSession() });
  }

  // admin: login
  if (pathname === "/api/admin/login" && method === "POST") {
    const ip = clientIp(req);
    const f = failedLogins.get(ip);
    if (f && f.until > Date.now()) return send(res, 429, { error: "Too many failed attempts. Try again in a few minutes." });
    const body = await readBody(req);
    const rec = readJson(ADMIN_FILE, null);
    const ok = rec && body.username === ADMIN_USERNAME && typeof body.password === "string" && checkPassword(body.password, rec);
    if (!ok) {
      let n = f ? f.count : 0;
      if (f && f.until && f.until <= Date.now()) n = 0; // an old lockout has expired
      n += 1;
      failedLogins.set(ip, { count: n, until: n >= 5 ? Date.now() + 10 * 60 * 1000 : 0 });
      return send(res, 401, { error: "Incorrect username or password." });
    }
    failedLogins.delete(ip);
    return send(res, 200, { ok: true, token: newSession() });
  }

  // everything below requires a signed-in admin
  if (pathname.startsWith("/api/admin/")) {
    if (!isAuthed(req)) return send(res, 401, { error: "Please sign in." });

    if (pathname === "/api/admin/logout" && method === "POST") {
      sessions.delete((req.headers.authorization || "").slice(7));
      return send(res, 200, { ok: true });
    }

    // ----- website content editor -----
    const cm = pathname.match(/^\/api\/admin\/content\/([a-z]+)$/);
    if (cm) {
      const key = cm[1];
      if (!CONTENT_KEYS.includes(key)) return send(res, 404, { error: "Unknown section." });
      if (method === "PUT") {
        const body = await readBody(req, 1024 * 1024);
        let value;
        try { value = cleanContent(key, body.value); }
        catch (e) { return send(res, 400, { error: e.message }); }
        const c = loadContent();
        c.content[key] = value;
        c.updatedAt = Date.now();
        writeJson(CONTENT_FILE, c);
        return send(res, 200, { ok: true, updatedAt: c.updatedAt });
      }
      if (method === "DELETE") {
        const c = loadContent();
        delete c.content[key];
        c.updatedAt = Date.now();
        writeJson(CONTENT_FILE, c);
        return send(res, 200, { ok: true, updatedAt: c.updatedAt });
      }
    }

    if (pathname === "/api/admin/upload" && method === "POST") {
      const buf = await readRaw(req, 10 * 1024 * 1024);
      const ext = sniffImage(buf);
      if (!ext) return send(res, 400, { error: "That file is not a valid JPG, PNG, WebP or GIF photo." });
      const name = Date.now().toString(36) + "-" + crypto.randomBytes(6).toString("hex") + "." + ext;
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
      return send(res, 201, { ok: true, url: "uploads/" + name });
    }

    if (pathname === "/api/admin/submissions" && method === "GET") {
      return send(res, 200, { items: loadDb().items });
    }

    if (pathname === "/api/admin/password" && method === "POST") {
      const body = await readBody(req);
      const rec = readJson(ADMIN_FILE, null);
      if (!checkPassword(String(body.current || ""), rec)) return send(res, 400, { error: "Current password is incorrect." });
      const next = typeof body.next === "string" ? body.next : "";
      if (next.length < 8 || next.length > 72) return send(res, 400, { error: "New password must be 8–72 characters." });
      writeJson(ADMIN_FILE, hashPassword(next));
      return send(res, 200, { ok: true });
    }

    const m = pathname.match(/^\/api\/admin\/submissions\/([a-f0-9]{16})$/);
    if (m) {
      const db = loadDb();
      const idx = db.items.findIndex((x) => x.id === m[1]);
      if (idx === -1) return send(res, 404, { error: "Not found." });

      if (method === "PATCH") {
        const body = await readBody(req);
        const it = db.items[idx];
        if (body.status !== undefined) {
          if (!STATUSES.includes(body.status)) return send(res, 400, { error: "Invalid status." });
          it.status = body.status;
        }
        if (body.notes !== undefined) {
          if (typeof body.notes !== "string" || body.notes.length > 2000) return send(res, 400, { error: "Notes too long (max 2000)." });
          it.notes = body.notes;
        }
        writeJson(SUBMISSIONS_FILE, db);
        return send(res, 200, { ok: true });
      }
      if (method === "DELETE") {
        db.items.splice(idx, 1);
        writeJson(SUBMISSIONS_FILE, db);
        return send(res, 200, { ok: true });
      }
    }
  }

  return send(res, 404, { error: "Not found." });
}

/* ---------- static files ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};
// Only these locations are public. server.js, data/, README etc. are never served.
const PUBLIC_RE = /^\/(?:[A-Za-z0-9_-]+\.html|(?:css|js|images)\/[A-Za-z0-9_\-./]+)$/;

function serveStatic(req, res, pathname) {
  if (pathname === "/") pathname = "/index.html";
  // photos uploaded from the Admin Portal (stored in data/uploads, nothing else in data/ is ever served)
  const up = pathname.match(/^\/uploads\/([a-z0-9]+-[a-f0-9]{12}\.(?:jpg|png|gif|webp))$/);
  if (up) {
    return fs.readFile(path.join(UPLOAD_DIR, up[1]), (err, buf) => {
      if (err) return notFound(res);
      res.writeHead(200, { "Content-Type": MIME["." + up[1].split(".").pop()] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
      res.end(req.method === "HEAD" ? undefined : buf);
    });
  }
  if (!PUBLIC_RE.test(pathname) || pathname.includes("..")) return notFound(res);
  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT + path.sep)) return notFound(res);
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type) return notFound(res);
  fs.readFile(file, (err, buf) => {
    if (err) return notFound(res);
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": /\.(png|jpe?g|webp|svg)$/i.test(file) ? "public, max-age=86400" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : buf);
  });
}
function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end('<!doctype html><meta charset="utf-8"><title>Not found</title><body style="font-family:sans-serif;text-align:center;padding:4rem"><h1>404</h1><p>Page not found.</p><a href="/">Back to home</a></body>');
}

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "same-origin");
    if (pathname.startsWith("/api/")) return await handleApi(req, res, pathname);
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, pathname);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : "Server error." });
    if (!e.status) console.error(e);
  }
});

server.listen(PORT, () => {
  console.log("\n  Kolehiyo ng Heneral Santos website is running");
  console.log(`  Website : http://localhost:${PORT}`);
  console.log(`  Admin   : http://localhost:${PORT}/admin.html`);
  if (!fs.existsSync(ADMIN_FILE)) console.log("  (No admin account yet - open the Admin link to create your password.)");
  console.log("  Press Ctrl+C to stop.\n");
});
