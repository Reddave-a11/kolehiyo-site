/* ==========================================================
   Store — where form submissions and the admin account live.

   Two modes, chosen automatically:

   1. "server"  – you started the site with  `node server.js`.
                  Submissions are saved in data/submissions.json and
                  every visitor's form reaches the same admin dashboard.
                  (Use this for the real school website.)

   2. "local"   – the site was opened with VS Code Live Server or by
                  double-clicking index.html. Submissions are saved in
                  THIS browser only (localStorage). Great for trying
                  everything out, but other people's submissions will
                  NOT show up here.
   ========================================================== */
(function () {
  "use strict";

  var DB_KEY = "khs_db";
  var ADMIN_KEY = "khs_admin";
  var TOKEN_KEY = "khs_token";
  var modePromise = null;

  /* ---------- helpers ---------- */
  function detectMode() {
    if (modePromise) return modePromise;
    modePromise = new Promise(function (resolve) {
      if (location.protocol === "file:") return resolve("local");
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve("local"); } }, 2500);
      fetch("/api/health", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!done) { done = true; clearTimeout(timer); resolve(j && j.ok ? "server" : "local"); } })
        .catch(function () { if (!done) { done = true; clearTimeout(timer); resolve("local"); } });
    });
    return modePromise;
  }

  function randomHex(n) {
    var a = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function sha256(text) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }
    // very small fallback for old/insecure contexts (demo mode only)
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return Promise.resolve((4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16));
  }

  function readLocalDb() {
    try {
      var db = JSON.parse(localStorage.getItem(DB_KEY));
      if (db && Array.isArray(db.items)) return db;
    } catch (e) { /* ignore */ }
    return { counter: { application: 0, inquiry: 0 }, items: [] };
  }
  function writeLocalDb(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  function api(method, path, body, auth) {
    var headers = { "Content-Type": "application/json" };
    if (auth) {
      var t = sessionStorage.getItem(TOKEN_KEY);
      if (t) headers.Authorization = "Bearer " + t;
    }
    return fetch(path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) {
            var err = new Error(j.error || "Request failed (" + r.status + ")");
            err.status = r.status;
            if (r.status === 401 && auth) sessionStorage.removeItem(TOKEN_KEY);
            throw err;
          }
          return j;
        });
      });
  }

  var PREFIX = { application: "APP", inquiry: "INQ" };
  var STATUSES = ["new", "in-review", "contacted", "done"];

  /* ---------- public API ---------- */
  var Store = {
    STATUSES: STATUSES,
    mode: detectMode,

    submit: function (type, data) {
      return detectMode().then(function (mode) {
        if (mode === "server") return api("POST", "/api/submissions", { type: type, data: data });
        var db = readLocalDb();
        db.counter[type] = (db.counter[type] || 0) + 1;
        var ref = PREFIX[type] + "-" + new Date().getFullYear() + "-" + ("0000" + db.counter[type]).slice(-4);
        db.items.push({ id: randomHex(8), ref: ref, type: type, status: "new", notes: "", createdAt: new Date().toISOString(), data: data });
        writeLocalDb(db);
        return { ok: true, ref: ref };
      });
    },

    admin: {
      status: function () {
        return detectMode().then(function (mode) {
          if (mode === "server") return api("GET", "/api/admin/status");
          var a = null;
          try { a = JSON.parse(localStorage.getItem(ADMIN_KEY)); } catch (e) { /* ignore */ }
          return { exists: !!(a && a.hash) };
        });
      },
      setup: function (password) {
        return detectMode().then(function (mode) {
          if (mode === "server") return api("POST", "/api/admin/setup", { password: password }).then(function (j) { sessionStorage.setItem(TOKEN_KEY, j.token); });
          var salt = randomHex(8);
          return sha256(salt + password).then(function (hash) {
            localStorage.setItem(ADMIN_KEY, JSON.stringify({ salt: salt, hash: hash }));
            sessionStorage.setItem(TOKEN_KEY, "local");
          });
        });
      },
      login: function (username, password) {
        return detectMode().then(function (mode) {
          if (mode === "server") return api("POST", "/api/admin/login", { username: username, password: password }).then(function (j) { sessionStorage.setItem(TOKEN_KEY, j.token); });
          var a = null;
          try { a = JSON.parse(localStorage.getItem(ADMIN_KEY)); } catch (e) { /* ignore */ }
          if (!a || username !== "admin") return Promise.reject(new Error("Incorrect username or password."));
          return sha256(a.salt + password).then(function (hash) {
            if (hash !== a.hash) throw new Error("Incorrect username or password.");
            sessionStorage.setItem(TOKEN_KEY, "local");
          });
        });
      },
      logout: function () {
        return detectMode().then(function (mode) {
          var p = mode === "server" ? api("POST", "/api/admin/logout", null, true).catch(function () {}) : Promise.resolve();
          return p.then(function () { sessionStorage.removeItem(TOKEN_KEY); });
        });
      },
      isLoggedIn: function () { return !!sessionStorage.getItem(TOKEN_KEY); },

      list: function () {
        return detectMode().then(function (mode) {
          if (mode === "server") return api("GET", "/api/admin/submissions", null, true).then(function (j) { return j.items; });
          if (!Store.admin.isLoggedIn()) { var e = new Error("Please sign in."); e.status = 401; throw e; }
          return readLocalDb().items;
        });
      },
      update: function (id, patch) {
        return detectMode().then(function (mode) {
          if (mode === "server") return api("PATCH", "/api/admin/submissions/" + encodeURIComponent(id), patch, true);
          var db = readLocalDb();
          var it = db.items.filter(function (x) { return x.id === id; })[0];
          if (!it) throw new Error("Not found");
          if (patch.status && STATUSES.indexOf(patch.status) > -1) it.status = patch.status;
          if (typeof patch.notes === "string") it.notes = patch.notes.slice(0, 2000);
          writeLocalDb(db);
          return { ok: true };
        });
      },
      remove: function (id) {
        return detectMode().then(function (mode) {
          if (mode === "server") return api("DELETE", "/api/admin/submissions/" + encodeURIComponent(id), null, true);
          var db = readLocalDb();
          db.items = db.items.filter(function (x) { return x.id !== id; });
          writeLocalDb(db);
          return { ok: true };
        });
      },
      changePassword: function (current, next) {
        return detectMode().then(function (mode) {
          if (mode === "server") return api("POST", "/api/admin/password", { current: current, next: next }, true);
          var a = JSON.parse(localStorage.getItem(ADMIN_KEY) || "null");
          if (!a) throw new Error("No admin account.");
          return sha256(a.salt + current).then(function (h) {
            if (h !== a.hash) throw new Error("Current password is incorrect.");
            var salt = randomHex(8);
            return sha256(salt + next).then(function (nh) {
              localStorage.setItem(ADMIN_KEY, JSON.stringify({ salt: salt, hash: nh }));
              return { ok: true };
            });
          });
        });
      },
    },
  };

  /* ---------- website content (editable from the Admin Portal) ---------- */
  var CONTENT_KEY = "khs_content";
  var CONTENT_KEYS = ["images", "courses", "news", "contact", "about"];
  var channel = null;
  try { channel = new BroadcastChannel("khs-content"); } catch (e) { /* older browsers */ }

  function readLocalContent() {
    try {
      var o = JSON.parse(localStorage.getItem(CONTENT_KEY));
      if (o && o.content && typeof o.content === "object") return o;
    } catch (e) { /* ignore */ }
    return { content: {}, updatedAt: 0 };
  }
  function announce() { try { if (channel) channel.postMessage("changed"); } catch (e) { /* ignore */ } }
  function needLogin() { var e = new Error("Please sign in."); e.status = 401; return e; }

  // Shrinks a photo to max 1600px and re-encodes it as JPEG so uploads stay small and fast.
  function prepareImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return reject(new Error("Please choose a JPG, PNG, WebP or GIF image."));
      if (file.size > 25 * 1024 * 1024) return reject(new Error("That file is too large (max 25 MB)."));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return reject(new Error("That image could not be read."));
        var k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("Could not process the image.")); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("That file could not be read as an image.")); };
      img.src = url;
    });
  }
  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error("Could not read the image.")); };
      r.readAsDataURL(blob);
    });
  }

  Store.content = {
    KEYS: CONTENT_KEYS,

    // what the admin has saved so far (only the changed parts)
    get: function () {
      return detectMode().then(function (mode) {
        if (mode === "server") {
          return fetch("/api/content", { cache: "no-store" }).then(function (r) {
            if (!r.ok) throw new Error("Could not load content.");
            return r.json();
          });
        }
        return readLocalContent();
      });
    },

    // defaults + saved edits  →  what the public pages should show
    merge: function (defaults, overrides) {
      var out = JSON.parse(JSON.stringify(defaults));
      overrides = overrides || {};
      ["images", "about", "contact"].forEach(function (k) {
        var o = overrides[k];
        if (o && typeof o === "object") Object.keys(o).forEach(function (f) { out[k][f] = o[f]; });
      });
      ["courses", "news"].forEach(function (k) { if (Array.isArray(overrides[k])) out[k] = overrides[k]; });
      return out;
    },

    save: function (key, value) {
      return detectMode().then(function (mode) {
        if (CONTENT_KEYS.indexOf(key) === -1) throw new Error("Unknown section.");
        if (mode === "server") return api("PUT", "/api/admin/content/" + key, { value: value }, true).then(function (j) { announce(); return j; });
        if (!Store.admin.isLoggedIn()) throw needLogin();
        var o = readLocalContent();
        o.content[key] = value; o.updatedAt = Date.now();
        try { localStorage.setItem(CONTENT_KEY, JSON.stringify(o)); }
        catch (e) { throw new Error("Browser storage is full. Use smaller photos, or run node server.js for unlimited storage."); }
        announce();
        return { ok: true };
      });
    },

    // go back to the original text/photos for one section
    reset: function (key) {
      return detectMode().then(function (mode) {
        if (mode === "server") return api("DELETE", "/api/admin/content/" + key, null, true).then(function (j) { announce(); return j; });
        if (!Store.admin.isLoggedIn()) throw needLogin();
        var o = readLocalContent();
        delete o.content[key]; o.updatedAt = Date.now();
        localStorage.setItem(CONTENT_KEY, JSON.stringify(o));
        announce();
        return { ok: true };
      });
    },

    // returns a URL the website can use for the uploaded photo
    upload: function (file) {
      return prepareImage(file).then(function (blob) {
        return detectMode().then(function (mode) {
          if (mode !== "server") return blobToDataUrl(blob);
          return fetch("/api/admin/upload", {
            method: "POST",
            headers: { "Content-Type": "image/jpeg", Authorization: "Bearer " + (sessionStorage.getItem(TOKEN_KEY) || "") },
            body: blob,
          }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) {
              if (!r.ok) {
                var err = new Error(j.error || "Upload failed (" + r.status + ")");
                err.status = r.status;
                if (r.status === 401) sessionStorage.removeItem(TOKEN_KEY);
                throw err;
              }
              return j.url;
            });
          });
        });
      });
    },

    // call back when the content changes in another tab of this browser
    onChange: function (cb) {
      if (channel) channel.addEventListener("message", function () { cb(); });
      window.addEventListener("storage", function (e) { if (e.key === CONTENT_KEY) cb(); });
    },
  };

  window.Store = Store;
})();
