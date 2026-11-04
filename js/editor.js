/* ==========================================================
   Admin Portal — website content editor
   Tabs: Photos · Courses · Bulletin · Contact · About

   Everything saved here is stored by the server (data/content.json
   and data/uploads/) and the public pages pick it up automatically.
   ========================================================== */
(function () {
  "use strict";

  var S = window.Store;
  var DEF = window.KHS_DEFAULTS;
  var ctx = null;          // { toast, handleErr } supplied by admin.js
  var host = null;
  var uid = 0;

  var KEY_OF = { photos: "images", courses: "courses", bulletin: "news", contact: "contact", about: "about" };
  var state = { effective: null, work: {}, dirty: {}, tab: null, msgEl: null, flagEl: null };

  /* ---------- tiny helpers ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function lines(s) { return String(s || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function button(text, onClick, cls) {
    var b = el("button", { type: "button", class: "btn " + (cls || "btn-outline") + " small", text: text });
    b.addEventListener("click", onClick);
    return b;
  }

  function field(label, value, onInput, o) {
    o = o || {};
    var id = "ed" + (++uid);
    var inp = o.area
      ? el("textarea", { class: "textarea" + (o.small ? " ed-textarea-sm" : ""), id: id })
      : el("input", { class: "input", id: id, type: o.type || "text" });
    inp.value = value || "";
    if (o.placeholder) inp.placeholder = o.placeholder;
    if (o.maxlength) inp.maxLength = o.maxlength;
    inp.addEventListener("input", function () {
      if (o.normalize) { var nv = o.normalize(inp.value); if (nv !== inp.value) inp.value = nv; }
      onInput(inp.value);
    });
    return el("div", { class: "field" }, [el("label", { for: id, text: label }), inp]);
  }

  /* ---------- dirty flag & messages ---------- */
  function updateFlag(key) {
    if (!state.flagEl) return;
    var d = !!state.dirty[key];
    state.flagEl.textContent = d ? "● Unsaved changes" : "All changes saved";
    state.flagEl.className = "dirty-flag" + (d ? "" : " clean");
  }
  function markDirty(key) { state.dirty[key] = true; updateFlag(key); }
  function showMsg(msg) {
    if (state.msgEl) { state.msgEl.textContent = msg || ""; state.msgEl.hidden = !msg; }
    else if (msg) ctx.toast(msg, true);
  }

  /* ---------- working copies ---------- */
  function load(force) {
    if (state.effective && !force) return Promise.resolve();
    return S.content.get().then(function (r) { state.effective = S.content.merge(DEF, r.content); });
  }
  function courseToWork(c) {
    var o = clone(c);
    o.hText = (c.highlights || []).join("\n");
    o.sText = (c.subjects || []).join("\n");
    o.cText = (c.careers || []).join("\n");
    return o;
  }
  function ensureWork(key) {
    if (state.work[key]) return;
    var v = clone(state.effective[key]);
    if (key === "courses") v = v.map(courseToWork);
    state.work[key] = v;
  }
  function toValue(key) {
    var w = state.work[key];
    if (key !== "courses") return clone(w);
    return w.map(function (c) {
      return {
        slug: c.slug, name: c.name, short: c.short, college: c.college, duration: c.duration, image: c.image || "",
        overview: c.overview, highlights: lines(c.hText), subjects: lines(c.sText), careers: lines(c.cText),
      };
    });
  }

  /* ---------- validation (the server checks again) ---------- */
  function validate(key, v) {
    var i;
    if (key === "about") {
      if (!v.mission.trim()) return "Mission is required.";
      if (!v.vision.trim()) return "Vision is required.";
      if (!v.mandate.trim()) return "Mandate is required.";
    }
    if (key === "contact") {
      if (!v.address.trim()) return "Address is required.";
      if (!EMAIL_RE.test(v.email.trim())) return "Please enter a valid contact email.";
      if (!/^https?:\/\/\S+$/i.test(v.facebook.trim())) return "Facebook link must start with http:// or https://";
      for (i = 0; i < v.offices.length; i++) {
        if (!v.offices[i].name.trim()) return "Office " + (i + 1) + " needs a name.";
        if (v.offices[i].email.trim() && !EMAIL_RE.test(v.offices[i].email.trim())) return "Office " + (i + 1) + ": please enter a valid email.";
      }
    }
    if (key === "news") {
      for (i = 0; i < v.length; i++) {
        if (!v[i].date.trim()) return "Announcement " + (i + 1) + " needs a date.";
        if (!v[i].title.trim()) return "Announcement " + (i + 1) + " needs a title.";
      }
    }
    if (key === "courses") {
      if (!v.length) return "Keep at least one course.";
      var seen = {};
      for (i = 0; i < v.length; i++) {
        if (!v[i].name.trim()) return "Course " + (i + 1) + " needs a name.";
        if (!/^[a-z0-9][a-z0-9-]*$/.test(v[i].slug)) return "Course " + (i + 1) + ": the web address may only use lowercase letters, numbers and dashes.";
        if (seen[v[i].slug]) return 'Two courses use the web address "' + v[i].slug + '". Each must be different.';
        seen[v[i].slug] = true;
      }
    }
    return "";
  }

  /* ---------- saving ---------- */
  // resolves true when saved, false when not (the reason is shown to the admin)
  function saveKey(key) {
    var value = toValue(key);
    var err = validate(key, value);
    if (err) { showMsg(err); return Promise.resolve(false); }
    showMsg("");
    return S.content.save(key, value).then(function () {
      state.effective[key] = clone(value);
      state.dirty[key] = false;
      updateFlag(key);
      ctx.toast("Saved — the website is updated.");
      return true;
    }).catch(function (e) {
      if (e && e.status === 401) ctx.handleErr(e);
      else showMsg((e && e.message) || "Could not save. Please try again.");
      return false;
    });
  }

  /* ---------- photo picker ---------- */
  function imagePicker(label, get, set) {
    var box = el("div", { class: "imgbox" });
    var pick = button("Replace photo", function () { file.click(); });
    var remove = button("Remove", function () { run(function () { return set(""); }); });
    var file = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", hidden: true });

    function paint() {
      box.innerHTML = "";
      var src = get();
      if (src) {
        var img = el("img", { alt: label });
        img.onerror = function () { box.innerHTML = ""; box.appendChild(el("span", { class: "imgph", text: "Photo file not found — click Replace photo." })); };
        img.src = src;
        box.appendChild(img);
      } else {
        box.appendChild(el("span", { class: "imgph", text: "No photo yet" }));
      }
      remove.hidden = !src;
    }
    function run(fn) {
      pick.disabled = remove.disabled = true;
      return Promise.resolve().then(fn).then(paint).catch(function (e) { if (!(e && e.handled)) ctx.handleErr(e); })
        .then(function () { pick.disabled = remove.disabled = false; pick.textContent = "Replace photo"; });
    }
    file.addEventListener("change", function () {
      var f = file.files[0];
      file.value = "";
      if (!f) return;
      pick.textContent = "Uploading…";
      run(function () { return S.content.upload(f).then(set); });
    });
    paint();
    return el("div", { class: "imgpick" }, [el("p", { class: "ed-lbl", text: label }), box, el("div", { class: "ed-row" }, [pick, remove, file])]);
  }

  /* ---------- shared pieces ---------- */
  function saveBar(key, saveLabel, extra) {
    var msg = el("div", { class: "form-msg error", role: "alert", hidden: true });
    var flag = el("span", { class: "dirty-flag clean", text: "All changes saved" });
    var save = button(saveLabel, function () {
      save.disabled = true;
      saveKey(key).then(function () { save.disabled = false; });
    }, "btn-navy");
    state.msgEl = msg;
    state.flagEl = flag;
    updateFlag(key);
    var bar = el("div", { class: "savebar" }, [save].concat(extra || [], [el("span", { class: "grow" }), flag, msg]));
    return bar;
  }
  function intro(text) { return el("p", { class: "ed-intro", text: text }); }

  /* ---------- tab: Photos ---------- */
  function renderPhotos() {
    var w = state.work.images;
    state.msgEl = el("div", { class: "form-msg error", role: "alert", hidden: true });
    state.flagEl = null;
    function setter(field) {
      return function (url) {
        var prev = w[field];
        w[field] = url;
        return saveKey("images").then(function (ok) {
          if (!ok) { w[field] = prev; var e = new Error("not saved"); e.handled = true; throw e; }
        });
      };
    }
    host.appendChild(intro("Photos are saved and shown on the website as soon as you choose them."));
    host.appendChild(el("div", { class: "ed-card" }, [
      el("div", { class: "ed-grid2" }, [
        imagePicker("Home page banner", function () { return w.heroBg; }, setter("heroBg")),
        imagePicker("Main campus photo (Home & About)", function () { return w.campusMain; }, setter("campusMain")),
      ]),
      el("p", { class: "ed-note", text: "Course photos are changed in the Courses tab." }),
      state.msgEl,
    ]));
  }

  /* ---------- tab: Courses ---------- */
  function moveItem(list, i, d) {
    var j = i + d;
    if (j < 0 || j >= list.length) return false;
    var t = list[i]; list[i] = list[j]; list[j] = t;
    return true;
  }
  function renderCourses() {
    var list = state.work.courses;
    host.appendChild(intro("Edit the programs shown on the Home, Programs and course pages. Changes go live when you click Save courses. The first two courses appear on the Home page."));

    list.forEach(function (c, i) {
      var card = el("div", { class: "ed-card" }, [
        el("div", { class: "ed-grid2" }, [
          imagePicker("Course photo", function () { return c.image; }, function (url) { c.image = url; markDirty("courses"); }),
          el("div", { class: "ed-stack" }, [
            field("Name", c.name, function (v) { c.name = v; markDirty("courses"); }, { maxlength: 120 }),
            field("Web address (letters and dashes)", c.slug, function (v) { c.slug = v; markDirty("courses"); },
              { maxlength: 60, normalize: function (v) { return v.toLowerCase().replace(/[^a-z0-9-]/g, "-"); } }),
            field("College", c.college, function (v) { c.college = v; markDirty("courses"); }, { maxlength: 120 }),
            field("Duration", c.duration, function (v) { c.duration = v; markDirty("courses"); }, { maxlength: 60 }),
          ]),
        ]),
        field("Short description", c.short, function (v) { c.short = v; markDirty("courses"); }, { maxlength: 300 }),
        field("Overview", c.overview, function (v) { c.overview = v; markDirty("courses"); }, { area: true, maxlength: 3000 }),
        el("div", { class: "ed-grid3" }, [
          field("Highlights (one per line)", c.hText, function (v) { c.hText = v; markDirty("courses"); }, { area: true, small: true }),
          field("Subjects (one per line)", c.sText, function (v) { c.sText = v; markDirty("courses"); }, { area: true, small: true }),
          field("Careers (one per line)", c.cText, function (v) { c.cText = v; markDirty("courses"); }, { area: true, small: true }),
        ]),
        el("div", { class: "ed-row" }, [
          button("↑ Move up", function () { if (moveItem(list, i, -1)) { markDirty("courses"); rerender(); } }),
          button("↓ Move down", function () { if (moveItem(list, i, 1)) { markDirty("courses"); rerender(); } }),
          button("Remove course", function () {
            if (!window.confirm("Remove “" + (c.name || "this course") + "”? It will be deleted from the website when you click Save courses.")) return;
            list.splice(i, 1); markDirty("courses"); rerender();
          }, "btn-outline danger-btn"),
        ]),
      ]);
      host.appendChild(card);
    });

    var add = button("+ Add course", function () {
      var n = list.length + 1, slug;
      do { slug = "new-course-" + n++; } while (list.some(function (x) { return x.slug === slug; }));
      list.push({ slug: slug, name: "New course", short: "", college: "", duration: "4 years", image: "", overview: "", hText: "", sText: "", cText: "" });
      markDirty("courses");
      rerender();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
    host.appendChild(saveBar("courses", "Save courses", [add]));
  }

  /* ---------- tab: Bulletin ---------- */
  function renderBulletin() {
    var list = state.work.news;
    host.appendChild(intro("Announcements appear on the Home page (latest 3) and the Bulletin page, newest first as arranged here. Changes go live when you click Save bulletin."));
    host.appendChild(el("div", { style: "margin-bottom:1rem" }, [
      button("+ New announcement", function () {
        list.unshift({
          date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          tag: "News", title: "", body: "",
        });
        markDirty("news");
        rerender();
      }),
    ]));
    if (!list.length) host.appendChild(el("p", { class: "ed-note", style: "margin-bottom:1rem", text: "No announcements. Click “+ New announcement” to add one." }));

    list.forEach(function (n, i) {
      host.appendChild(el("div", { class: "ed-card" }, [
        el("div", { class: "ed-grid2" }, [
          field("Date", n.date, function (v) { n.date = v; markDirty("news"); }, { maxlength: 60 }),
          field("Tag", n.tag, function (v) { n.tag = v; markDirty("news"); }, { maxlength: 40 }),
        ]),
        field("Title", n.title, function (v) { n.title = v; markDirty("news"); }, { maxlength: 200 }),
        field("Details", n.body, function (v) { n.body = v; markDirty("news"); }, { area: true, maxlength: 2000 }),
        el("div", { class: "ed-row" }, [
          button("↑ Move up", function () { if (moveItem(list, i, -1)) { markDirty("news"); rerender(); } }),
          button("↓ Move down", function () { if (moveItem(list, i, 1)) { markDirty("news"); rerender(); } }),
          button("Remove", function () {
            if (!window.confirm("Remove this announcement? It will be deleted from the website when you click Save bulletin.")) return;
            list.splice(i, 1); markDirty("news"); rerender();
          }, "btn-outline danger-btn"),
        ]),
      ]));
    });
    host.appendChild(saveBar("news", "Save bulletin"));
  }

  /* ---------- tab: Contact ---------- */
  function renderContact() {
    var c = state.work.contact;
    host.appendChild(intro("Shown on the Contact page, the website footer and the “Send to” list of the contact form."));

    var offices = el("div", { class: "ed-stack" });
    function drawOffices() {
      offices.innerHTML = "";
      c.offices.forEach(function (o, i) {
        function cell(name, ph, max) {
          var inp = el("input", { class: "input", placeholder: ph, maxlength: max, "aria-label": "Office " + (i + 1) + " " + name });
          inp.value = o[name] || "";
          inp.addEventListener("input", function () { o[name] = inp.value; markDirty("contact"); });
          return inp;
        }
        offices.appendChild(el("div", { class: "ed-office" }, [
          cell("name", "Office name", 100), cell("email", "Email", 120), cell("phone", "Phone", 40),
          button("Remove", function () { c.offices.splice(i, 1); markDirty("contact"); drawOffices(); }),
        ]));
      });
    }
    drawOffices();

    host.appendChild(el("div", { class: "ed-card" }, [
      field("Address", c.address, function (v) { c.address = v; markDirty("contact"); }, { maxlength: 300 }),
      field("Email", c.email, function (v) { c.email = v; markDirty("contact"); }, { maxlength: 120, type: "email" }),
      field("Facebook link", c.facebook, function (v) { c.facebook = v; markDirty("contact"); }, { maxlength: 300 }),
      field("Office hours", c.hours, function (v) { c.hours = v; markDirty("contact"); }, { area: true, maxlength: 300 }),
      el("p", { class: "ed-title", text: "Offices" }),
      offices,
    ]));
    var add = button("+ Add office", function () { c.offices.push({ name: "", email: "", phone: "" }); markDirty("contact"); drawOffices(); });
    host.appendChild(saveBar("contact", "Save contact", [add]));
  }

  /* ---------- tab: About ---------- */
  function renderAbout() {
    var a = state.work.about;
    host.appendChild(intro("Shown on the About page."));
    host.appendChild(el("div", { class: "ed-card" }, [
      field("Mission", a.mission, function (v) { a.mission = v; markDirty("about"); }, { area: true, maxlength: 1500 }),
      field("Vision", a.vision, function (v) { a.vision = v; markDirty("about"); }, { area: true, maxlength: 1500 }),
      field("Mandate", a.mandate, function (v) { a.mandate = v; markDirty("about"); }, { area: true, maxlength: 1500 }),
    ]));
    var reset = button("Reset to original text", function () {
      if (!window.confirm("Put the original Mission, Vision and Mandate back in the boxes? (Nothing changes on the website until you click Save.)")) return;
      state.work.about = clone(DEF.about);
      markDirty("about");
      rerender();
    });
    host.appendChild(saveBar("about", "Save", [reset]));
  }

  /* ---------- tab switching ---------- */
  var RENDER = { photos: renderPhotos, courses: renderCourses, bulletin: renderBulletin, contact: renderContact, about: renderAbout };

  function rerender() {
    var y = window.scrollY;
    host.innerHTML = "";
    state.msgEl = null; state.flagEl = null;
    ensureWork(KEY_OF[state.tab]);
    RENDER[state.tab]();
    window.scrollTo(0, y);
  }

  var Editor = {
    init: function (c) {
      ctx = c;
      host = document.getElementById("editorHost");
      window.addEventListener("beforeunload", function (e) {
        if (Editor.hasUnsaved()) { e.preventDefault(); e.returnValue = ""; }
      });
    },
    open: function (tab) {
      state.tab = tab;
      host.innerHTML = "";
      host.appendChild(el("p", { class: "ed-note", text: "Loading…" }));
      return load(false).then(function () {
        if (state.tab !== tab) return; // admin already switched tabs
        rerender();
      }).catch(function (e) { host.innerHTML = ""; ctx.handleErr(e); });
    },
    // forget everything (sign-in / sign-out)
    reset: function () { state.effective = null; state.work = {}; state.dirty = {}; state.tab = null; },
    hasUnsaved: function () { return Object.keys(state.dirty).some(function (k) { return state.dirty[k]; }); },
  };
  window.AdminEditor = Editor;
})();
