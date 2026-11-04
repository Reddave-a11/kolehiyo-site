/* ==========================================================
   Admin dashboard — sign in, monitor, search, update status,
   add notes, delete and export form submissions.
   ========================================================== */
(function () {
  "use strict";
  var S = window.Store;

  /* ---------- tiny helpers ---------- */
  function $(id) { return document.getElementById(id); }
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
  function show(id, on) { $(id).hidden = !on; }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  var STATUS_LABEL = { "new": "New", "in-review": "In review", contacted: "Contacted", done: "Done" };
  var toastTimer;
  function toast(msg, isErr) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, 2800);
  }
  function showErr(id, msg) { var b = $(id); b.textContent = msg; b.hidden = !msg; }

  var state = { items: [], mode: "local", current: null, timer: null };

  /* ---------- views ---------- */
  function showView(name) {
    show("viewLoading", name === "loading");
    show("viewAuth", name === "auth");
    show("viewDash", name === "dash");
  }

  function setupModeUI() {
    var badge = $("modeBadge");
    badge.textContent = state.mode === "server" ? "Live · server" : "Demo · this browser";
    badge.className = "badge " + (state.mode === "server" ? "server" : "local");

    var html = state.mode === "local"
      ? "<strong>Demo mode.</strong> Submissions are saved in this browser only, so forms filled in on other devices will not appear here. To collect real submissions from all visitors, run <code>node server.js</code> and open <code>http://localhost:3000</code> (see README)."
      : "";
    ["modeBanner", "dashBanner"].forEach(function (id) {
      var b = $(id);
      b.innerHTML = html; // hard-coded text only
      b.hidden = !html;
    });
  }

  function openAuth(message) {
    showView("auth");
    S.admin.status().then(function (st) {
      var exists = st.exists;
      show("loginForm", exists);
      show("setupForm", !exists);
      $("authTitle").textContent = exists ? "Admin Sign In" : "Create Admin Account";
      showErr("loginErr", message || "");
      (exists ? $("lPass") : $("sPass")).focus();
    }).catch(function (e) {
      showView("auth");
      show("loginForm", true);
      showErr("loginErr", e.message || "Could not reach the server.");
    });
  }

  function handleErr(e) {
    if (e && e.status === 401) { openAuth("Your session expired. Please sign in again."); return; }
    toast((e && e.message) || "Something went wrong.", true);
  }

  /* ---------- data loading & rendering ---------- */
  function load(silent) {
    return S.admin.list().then(function (items) {
      state.items = items || [];
      render();
    }).catch(function (e) { if (!silent) handleErr(e); else if (e && e.status === 401) handleErr(e); });
  }

  function programOf(it) { return it.type === "application" ? it.data.program || "" : ""; }
  function subjectOf(it) { return it.type === "application" ? it.data.program || "—" : it.data.subject || "—"; }

  function filtered() {
    var q = $("fSearch").value.trim().toLowerCase();
    var type = $("fType").value, status = $("fStatus").value, prog = $("fProgram").value, sort = $("fSort").value;
    var list = state.items.filter(function (it) {
      if (type && it.type !== type) return false;
      if (status && it.status !== status) return false;
      if (prog && programOf(it) !== prog && (it.data.program2 || "") !== prog) return false;
      if (q) {
        var hay = [it.ref, it.data.fullName, it.data.email, it.data.phone, it.data.subject, it.data.program, it.data.message].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      if (sort === "name") return String(a.data.fullName).localeCompare(String(b.data.fullName));
      var d = new Date(a.createdAt) - new Date(b.createdAt);
      return sort === "oldest" ? d : -d;
    });
    return list;
  }

  function render() {
    var items = state.items;
    var todayStr = new Date().toDateString();
    $("stTotal").textContent = items.length;
    var newCount = items.filter(function (i) { return i.status === "new"; }).length;
    $("stNew").textContent = newCount;
    $("tabNewBadge").textContent = newCount;
    $("tabNewBadge").hidden = newCount === 0;
    $("stApps").textContent = items.filter(function (i) { return i.type === "application"; }).length;
    $("stInq").textContent = items.filter(function (i) { return i.type === "inquiry"; }).length;
    $("stToday").textContent = items.filter(function (i) { return new Date(i.createdAt).toDateString() === todayStr; }).length;

    renderBars();

    var list = filtered();
    var body = $("rows");
    body.innerHTML = "";
    list.forEach(function (it) {
      var tr = el("tr", { class: it.status === "new" ? "row-new" : "", "data-id": it.id }, [
        el("td", {}, [el("span", { class: "mono ref", text: it.ref })]),
        el("td", {}, [el("span", { class: "chip " + it.type, text: it.type === "application" ? "Application" : "Inquiry" })]),
        el("td", {}, [el("span", { class: "nm", text: it.data.fullName || "—" })]),
        el("td", {}, [el("div", { class: "trunc", text: it.data.email || "—" })]),
        el("td", {}, [el("div", { class: "trunc", text: subjectOf(it) })]),
        el("td", {}, [el("span", { class: "date", text: fmtDate(it.createdAt) })]),
        el("td", {}, [el("span", { class: "chip s-" + it.status, text: STATUS_LABEL[it.status] || it.status })]),
        el("td", {}, [el("button", { type: "button", class: "row-btn", text: "View" })]),
      ]);
      tr.addEventListener("click", function () { openDetail(it.id); });
      body.appendChild(tr);
    });
    show("emptyMsg", list.length === 0);
    $("countLine").textContent = "Showing " + list.length + " of " + items.length + " submission" + (items.length === 1 ? "" : "s");
  }

  function renderBars() {
    var counts = {};
    state.items.forEach(function (it) {
      if (it.type !== "application" || !it.data.program) return;
      counts[it.data.program] = (counts[it.data.program] || 0) + 1;
    });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var host = $("programBars");
    host.innerHTML = "";
    if (!names.length) { host.appendChild(el("p", { class: "empty", style: "padding:0.5rem 0", text: "No applications yet." })); return; }
    var max = counts[names[0]];
    names.forEach(function (n) {
      var fill = el("div", { class: "bar-fill" });
      fill.style.width = Math.round((counts[n] / max) * 100) + "%";
      host.appendChild(el("div", { class: "bar-row" }, [
        el("span", { class: "label", title: n, text: n }),
        el("div", { class: "bar-track" }, [fill]),
        el("span", { class: "num", text: String(counts[n]) }),
      ]));
    });
  }

  /* ---------- detail dialog ---------- */
  var FIELD_LABELS = {
    application: [["fullName", "Full name"], ["email", "Email"], ["phone", "Mobile"], ["birthdate", "Date of birth"], ["resident", "GenSan resident"], ["address", "Address", true], ["lastSchool", "Last school", true], ["program", "First choice"], ["program2", "Second choice"], ["message", "Message", true], ["consent", "Privacy consent"]],
    inquiry: [["fullName", "Full name"], ["email", "Email"], ["phone", "Phone"], ["office", "Sent to"], ["subject", "Subject", true], ["message", "Message", true]],
  };

  function findItem(id) { return state.items.filter(function (i) { return i.id === id; })[0]; }

  function openDetail(id) {
    var it = findItem(id);
    if (!it) return;
    state.current = it;
    $("dType").textContent = (it.type === "application" ? "Application" : "Inquiry") + " · " + it.ref;
    $("dTitle").textContent = it.data.fullName || it.ref;
    var dl = $("dFields");
    dl.innerHTML = "";
    FIELD_LABELS[it.type].forEach(function (f) {
      var v = it.data[f[0]];
      if (!v) return;
      dl.appendChild(el("div", { class: f[2] ? "wide" : "" }, [el("dt", { text: f[1] }), el("dd", { text: v })]));
    });
    dl.appendChild(el("div", { class: "wide" }, [el("dt", { text: "Submitted" }), el("dd", { text: fmtDate(it.createdAt) })]));
    $("dStatus").value = it.status;
    $("dNotes").value = it.notes || "";
    showErr("dErr", "");
    var subject = it.type === "application" ? "Your application to Kolehiyo ng Heneral Santos (" + it.ref + ")" : "Re: " + (it.data.subject || "your message");
    $("dMail").href = "mailto:" + encodeURIComponent(it.data.email || "").replace("%40", "@") + "?subject=" + encodeURIComponent(subject);
    $("detailDlg").showModal();
  }

  function saveDetail() {
    var it = state.current;
    if (!it) return;
    var btn = $("dSave");
    btn.disabled = true;
    S.admin.update(it.id, { status: $("dStatus").value, notes: $("dNotes").value }).then(function () {
      it.status = $("dStatus").value;
      it.notes = $("dNotes").value;
      render();
      $("detailDlg").close();
      toast("Saved.");
    }).catch(function (e) {
      if (e && e.status === 401) { $("detailDlg").close(); handleErr(e); }
      else showErr("dErr", e.message || "Could not save.");
    }).then(function () { btn.disabled = false; });
  }

  function deleteCurrent() {
    var it = state.current;
    if (!it) return;
    if (!window.confirm("Delete " + it.ref + " (" + (it.data.fullName || "") + ")? This cannot be undone.")) return;
    S.admin.remove(it.id).then(function () {
      state.items = state.items.filter(function (x) { return x.id !== it.id; });
      render();
      $("detailDlg").close();
      toast("Deleted.");
    }).catch(function (e) {
      if (e && e.status === 401) { $("detailDlg").close(); handleErr(e); }
      else showErr("dErr", e.message || "Could not delete.");
    });
  }

  /* ---------- CSV export ---------- */
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCsv() {
    var list = filtered();
    if (!list.length) { toast("Nothing to export.", true); return; }
    var cols = [
      ["Reference", function (i) { return i.ref; }],
      ["Type", function (i) { return i.type; }],
      ["Status", function (i) { return STATUS_LABEL[i.status] || i.status; }],
      ["Submitted", function (i) { return i.createdAt; }],
      ["Full name", function (i) { return i.data.fullName; }],
      ["Email", function (i) { return i.data.email; }],
      ["Phone", function (i) { return i.data.phone; }],
      ["Date of birth", function (i) { return i.data.birthdate; }],
      ["GenSan resident", function (i) { return i.data.resident; }],
      ["Address", function (i) { return i.data.address; }],
      ["Last school", function (i) { return i.data.lastSchool; }],
      ["First choice", function (i) { return i.data.program; }],
      ["Second choice", function (i) { return i.data.program2; }],
      ["Office", function (i) { return i.data.office; }],
      ["Subject", function (i) { return i.data.subject; }],
      ["Message", function (i) { return i.data.message; }],
      ["Staff notes", function (i) { return i.notes; }],
    ];
    var lines = [cols.map(function (c) { return csvCell(c[0]); }).join(",")];
    list.forEach(function (it) { lines.push(cols.map(function (c) { return csvCell(c[1](it)); }).join(",")); });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "khs-submissions-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast("Exported " + list.length + " row" + (list.length === 1 ? "" : "s") + ".");
  }

  /* ---------- tabs ---------- */
  var TABS = ["submissions", "photos", "courses", "bulletin", "contact", "about"];

  function showTab(name) {
    if (TABS.indexOf(name) === -1) name = "submissions";
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    show("tab-submissions", name === "submissions");
    show("tab-editor", name !== "submissions");
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    if (name !== "submissions") window.AdminEditor.open(name);
  }
  function tabFromHash() { return (location.hash || "").replace("#", ""); }

  /* ---------- wiring ---------- */
  function enterDashboard() {
    showView("dash");
    showTab(tabFromHash());
    load(false);
    clearInterval(state.timer);
    if (state.mode === "server") {
      state.timer = setInterval(function () {
        if (document.hidden || $("detailDlg").open || $("pwDlg").open) return;
        load(true);
      }, 30000);
    }
  }

  function wire() {
    window.AdminEditor.init({ toast: toast, handleErr: handleErr });
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); });
    });
    // password show/hide
    document.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var inp = $(b.getAttribute("data-toggle"));
        var showing = inp.type === "text";
        inp.type = showing ? "password" : "text";
        b.textContent = showing ? "Show" : "Hide";
      });
    });

    // dialogs: close buttons + backdrop click
    document.querySelectorAll("dialog").forEach(function (dlg) {
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
      dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    });

    $("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      showErr("loginErr", "");
      var btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      S.admin.login($("lUser").value.trim(), $("lPass").value).then(function () {
        $("lPass").value = "";
        enterDashboard();
      }).catch(function (err) { showErr("loginErr", err.message || "Sign in failed."); })
        .then(function () { btn.disabled = false; });
    });

    $("setupForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var p1 = $("sPass").value, p2 = $("sPass2").value;
      if (p1.length < 8) return showErr("setupErr", "Password must be at least 8 characters.");
      if (p1 !== p2) return showErr("setupErr", "Passwords do not match.");
      showErr("setupErr", "");
      var btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      S.admin.setup(p1).then(function () {
        $("sPass").value = ""; $("sPass2").value = "";
        enterDashboard();
        toast("Admin account created.");
      }).catch(function (err) { showErr("setupErr", err.message || "Could not create account."); })
        .then(function () { btn.disabled = false; });
    });

    $("btnLogout").addEventListener("click", function () {
      if (window.AdminEditor.hasUnsaved() && !window.confirm("You have unsaved website changes. Log out anyway?")) return;
      window.AdminEditor.reset();
      clearInterval(state.timer);
      S.admin.logout().then(function () { state.items = []; openAuth(""); });
    });
    $("btnRefresh").addEventListener("click", function () { load(false).then(function () { toast("Refreshed."); }); });
    $("btnExport").addEventListener("click", exportCsv);
    $("btnPw").addEventListener("click", function () {
      $("pwForm").reset(); showErr("pErr", ""); $("pwDlg").showModal();
    });

    $("pwForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var cur = $("pCur").value, n1 = $("pNew").value, n2 = $("pNew2").value;
      if (n1.length < 8) return showErr("pErr", "New password must be at least 8 characters.");
      if (n1 !== n2) return showErr("pErr", "New passwords do not match.");
      S.admin.changePassword(cur, n1).then(function () {
        $("pwDlg").close();
        toast("Password updated.");
      }).catch(function (err) { showErr("pErr", err.message || "Could not update password."); });
    });

    $("dSave").addEventListener("click", saveDetail);
    $("dDelete").addEventListener("click", deleteCurrent);

    ["fSearch", "fType", "fStatus", "fProgram", "fSort"].forEach(function (id) {
      $(id).addEventListener(id === "fSearch" ? "input" : "change", render);
    });

    // program filter options come from the site data
    var sel = $("fProgram");
    (window.KHS ? window.KHS.courses : []).forEach(function (c) { sel.appendChild(el("option", { value: c.name, text: c.name })); });
  }

  /* ---------- boot ---------- */
  wire();
  showView("loading");
  S.mode().then(function (mode) {
    state.mode = mode;
    setupModeUI();
    if (S.admin.isLoggedIn()) {
      // verify the saved session is still good before showing the dashboard
      S.admin.list().then(function (items) { state.items = items; enterDashboardNoReload(); }).catch(function () { openAuth(""); });
    } else {
      openAuth("");
    }
  });

  function enterDashboardNoReload() {
    showView("dash");
    showTab(tabFromHash());
    render();
    clearInterval(state.timer);
    if (state.mode === "server") {
      state.timer = setInterval(function () {
        if (document.hidden || $("detailDlg").open || $("pwDlg").open) return;
        load(true);
      }, 30000);
    }
  }
})();
