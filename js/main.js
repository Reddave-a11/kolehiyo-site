/* ==========================================================
   Kolehiyo ng Heneral Santos — shared site script
   Builds the header / footer and renders content pages
   from js/data.js. No build step required.
   ========================================================== */
(function () {
  "use strict";
  var D = window.KHS; // replaced by "defaults + admin edits" once content has loaded

  /* ---------- tiny DOM helper ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v; // only used with trusted, hard-coded strings
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function $(id) { return document.getElementById(id); }
  function clear(id) { var n = $(id); if (n) n.innerHTML = ""; return n; }
  // only allow normal web links (blocks javascript: etc.)
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : "#"; }
  // makes a photo path safe to place inside CSS url("...")
  function cssUrl(u) { return 'url("' + String(u).replace(/["\\\n\r)(]/g, function (c) { return encodeURIComponent(c); }) + '")'; }

  var ICON = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>',
  };

  /* ---------- header & footer ---------- */
  var NAV = [
    ["index.html", "Home"],
    ["about.html", "About"],
    ["programs.html", "Programs"],
    ["admissions.html", "Admissions"],
    ["news.html", "Bulletin"],
    ["contact.html", "Contact"],
  ];
  var current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (current === "course.html") current = "programs.html";

  function buildHeader() {
    var host = $("site-header");
    if (!host) return;
    host.innerHTML = "";
    var links = NAV.map(function (n) {
      return el("a", { href: n[0], class: n[0] === current ? "active" : "", text: n[1] });
    });
    var mobileLinks = NAV.map(function (n) { return el("a", { href: n[0], text: n[1] }); });
    var toggle = el("button", { type: "button", class: "nav-toggle", "aria-label": "Toggle menu", "aria-expanded": "false" }, [el("span"), el("span")]);
    var mobile = el("div", { class: "nav-mobile", id: "nav-mobile" }, mobileLinks);
    toggle.addEventListener("click", function () {
      var open = mobile.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    var brand = el("a", { href: "index.html", class: "brand" }, [
      el("img", { src: "images/favicon.png", alt: "Official seal of Kolehiyo ng Heneral Santos", width: 40, height: 40 }),
      el("span", { html: "Kolehiyo ng <br>Heneral Santos" }),
    ]);
    host.appendChild(
      el("nav", { class: "site-nav" }, [
        el("div", { class: "nav-inner" }, [brand, el("div", { class: "nav-links" }, links), toggle]),
        mobile,
      ])
    );
  }

  function buildFooter() {
    var host = $("site-footer");
    if (!host) return;
    host.innerHTML = "";
    var c = D.contact;
    var fb = c.facebook.replace(/^https?:\/\/(www\.)?/, "");
    host.appendChild(
      el("footer", { class: "site-footer" }, [
        el("div", { class: "wrap" }, [
          el("div", { class: "footer-top" }, [
            el("div", { class: "footer-brand" }, [
              el("img", { src: "images/seal.png", alt: "Seal of Kolehiyo ng Heneral Santos", width: 72, height: 72, loading: "lazy" }),
              el("h2", { html: "Kolehiyo ng <br>Heneral Santos" }),
              el("p", { class: "row" }, [el("span", { html: ICON.pin }), el("span", { text: c.address })]),
              el("p", { class: "row" }, [el("span", { html: ICON.mail }), el("a", { href: "mailto:" + encodeURI(c.email), text: c.email })]),
              el("p", { class: "row" }, [el("span", { html: ICON.fb }), el("a", { href: safeUrl(c.facebook), target: "_blank", rel: "noreferrer", text: fb })]),
            ]),
            el("div", { class: "footer-cols" }, [
              el("div", {}, [
                el("h3", { text: "Academics" }),
                el("ul", {}, [
                  el("li", {}, [el("a", { href: "programs.html", text: "Programs" })]),
                  el("li", {}, [el("a", { href: "about.html", text: "About the College" })]),
                  el("li", {}, [el("a", { href: "news.html", text: "Bulletin" })]),
                ]),
              ]),
              el("div", {}, [
                el("h3", { text: "Admissions" }),
                el("ul", {}, [
                  el("li", {}, [el("a", { href: "admissions.html", text: "How to Apply" })]),
                  el("li", {}, [el("a", { href: "admissions.html#apply", text: "Apply Online" })]),
                  el("li", {}, [el("a", { href: "contact.html", text: "Registrar" })]),
                ]),
              ]),
            ]),
          ]),
          el("div", { class: "footer-bottom" }, [
            "© " + new Date().getFullYear() + " Kolehiyo ng Heneral Santos · ",
            el("a", { href: "admin.html", text: "Staff login" }),
          ]),
        ]),
      ])
    );
  }

  /* ---------- reusable renderers (safe to call again to refresh) ---------- */
  function courseHref(c) { return "course.html?slug=" + encodeURIComponent(c.slug); }

  function pillar(c, i) {
    var img = el("img", { alt: c.name, width: 1200, height: 675, loading: "lazy" });
    if (c.image) {
      img.src = c.image;
      img.onerror = function () { img.style.visibility = "hidden"; }; // missing photo → plain placeholder box
    } else {
      img.style.visibility = "hidden";
    }
    return el("a", { class: "pillar", href: courseHref(c), style: "animation-delay:" + i * 100 + "ms" }, [
      el("div", { class: "img-box" }, [img]),
      el("p", { class: "tag", text: c.college }),
      el("h3", { text: c.name }),
      el("p", { class: "body", text: c.short }),
    ]);
  }

  // Loads a photo; shows it (or hides the section) depending on whether it exists.
  function showIfImageExists(src, sectionId, imgId) {
    var sec = $(sectionId), img = $(imgId);
    if (!sec || !img) return;
    if (!src) { sec.hidden = true; return; }
    var probe = new Image();
    probe.onload = function () { img.src = src; sec.hidden = false; };
    probe.onerror = function () { sec.hidden = true; };
    probe.src = src;
  }

  function emptyNote(text) { return el("p", { style: "font-size:14px;color:rgba(22,39,121,0.6)", text: text }); }

  function renderHome() {
    var host = clear("pillars");
    if (host) D.courses.slice(0, 2).forEach(function (c, i) { host.appendChild(pillar(c, i)); });

    var bul = clear("bulletin");
    if (bul) {
      if (!D.news.length) bul.appendChild(emptyNote("No announcements yet."));
      D.news.slice(0, 3).forEach(function (n, i) {
        bul.appendChild(el("div", { class: "note-card" + (i === 0 ? " accent" : "") }, [
          el("span", { class: "date", text: n.date }),
          el("h3", { text: n.title }),
        ]));
      });
    }

    var cap = $("campusCaption");
    if (cap) cap.textContent = "Main campus — " + D.contact.address;

    // home banner photo (falls back to the navy gradient when there is no photo)
    var hero = $("heroBanner");
    if (hero) {
      var fallback = "";
      hero.style.backgroundImage = fallback;
      var src = D.images.heroBg;
      if (src) {
        var probe = new Image();
        probe.onload = function () {
          hero.style.backgroundImage = "linear-gradient(rgba(10,22,82,0.82), rgba(10,22,82,0.82)), " + cssUrl(src);
          hero.style.backgroundSize = "cover";
          hero.style.backgroundPosition = "center";
        };
        probe.src = src;
      }
    }
    showIfImageExists(D.images.campusMain, "campusPhoto", "campusImg");
  }

  function renderAbout() {
    var host = clear("valueCards");
    if (host) [["Mission", D.about.mission], ["Vision", D.about.vision], ["Mandate", D.about.mandate]].forEach(function (v) {
      host.appendChild(el("div", { class: "value-card" }, [el("h2", { text: v[0] }), el("p", { text: v[1] })]));
    });
    var core = clear("coreValues");
    if (core) D.values.forEach(function (v) {
      core.appendChild(el("div", {}, [el("h3", { text: v[0] }), el("p", { text: v[1] })]));
    });
    showIfImageExists(D.images.campusMain, "campusPhoto", "campusImg");
  }

  function renderPrograms() {
    var feat = clear("featured");
    if (feat) D.courses.slice(0, 2).forEach(function (c, i) { feat.appendChild(pillar(c, i)); });
    var list = clear("courseList");
    if (list) D.courses.forEach(function (c) {
      list.appendChild(el("li", {}, [
        el("a", { href: courseHref(c) }, [
          el("span", {}, [el("span", { class: "t", text: c.name }), el("span", { class: "s", text: c.short })]),
          el("span", { class: "arrow", text: "→" }),
        ]),
      ]));
    });
  }

  function listCard(title, items) {
    return el("div", { class: "list-card" }, [
      el("h2", { text: title }),
      el("div", { class: "bar" }),
      el("ul", {}, items.map(function (i) { return el("li", {}, [el("span", { class: "dot-bullet" }), el("span", { text: i })]); })),
    ]);
  }

  function renderCourse() {
    var slug = new URLSearchParams(location.search).get("slug");
    var c = D.courses.filter(function (x) { return x.slug === slug; })[0];
    var root = clear("courseRoot");
    if (!root) return;
    if (!c) {
      document.title = "Course not found — Kolehiyo ng Heneral Santos";
      root.appendChild(el("div", { class: "section", style: "text-align:center;padding-block:6rem" }, [
        el("h1", { class: "font-display", style: "font-size:1.875rem;margin-bottom:1rem", text: "Course not found" }),
        el("a", { href: "programs.html", class: "link-under", style: "margin-top:0", text: "Back to programs" }),
      ]));
      return;
    }
    document.title = c.name + " — Kolehiyo ng Heneral Santos";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", c.overview);

    var hero = el("header", { class: "course-hero" }, [
      el("div", { class: "inner" }, [
        el("p", { class: "eyebrow", text: c.college }),
        el("h1", { text: c.name }),
        el("div", { class: "bar" }),
        el("p", { text: c.overview }),
      ]),
    ]);
    if (c.image) hero.style.backgroundImage = cssUrl(c.image);

    function fact(k, v) { return el("div", {}, [el("div", { class: "k", text: k }), el("div", { class: "v", text: v })]); }
    var body = el("section", { class: "section-tight section-silver" }, [
      el("div", { class: "wrap" }, [
        el("div", { class: "facts" }, [fact("Duration", c.duration || "—"), fact("College", c.college || "—"), fact("Tuition", "Free for Gensan Youth")]),
        el("div", { class: "grid-3" }, [
          listCard("Program Highlights", c.highlights),
          listCard("Key Subjects", c.subjects),
          listCard("Career Paths", c.careers),
        ]),
        el("div", { class: "btn-row" }, [
          el("a", { class: "btn btn-navy", href: "admissions.html?program=" + encodeURIComponent(c.slug) + "#apply" }, [
            "Apply for this program ", el("span", { class: "dot" }),
          ]),
          el("a", { href: "programs.html", style: "padding:1rem;font-size:14px;font-weight:600", text: "← All programs" }),
        ]),
      ]),
    ]);
    root.appendChild(hero);
    root.appendChild(body);
  }

  function renderNews() {
    var host = clear("newsList");
    if (!host) return;
    if (!D.news.length) host.appendChild(emptyNote("No announcements yet. Please check back soon."));
    D.news.forEach(function (n, i) {
      host.appendChild(el("article", { class: "note-card news-item" + (i === 0 ? " accent" : "") }, [
        el("div", { class: "meta" }, [
          el("span", { class: "date", style: "margin:0", text: n.date }),
          n.tag ? el("span", { class: "tagchip", text: n.tag }) : null,
        ]),
        el("h2", { text: n.title }),
        n.body ? el("p", { text: n.body }) : null,
      ]));
    });
  }

  function renderAdmissions() {
    var steps = clear("steps");
    if (steps) D.steps.forEach(function (s) {
      steps.appendChild(el("li", {}, [
        el("span", { class: "n", text: s[0] }),
        el("div", {}, [el("h3", { text: s[1] }), el("p", { text: s[2] })]),
      ]));
    });
    var reqs = clear("reqs");
    if (reqs) D.requirements.forEach(function (r) {
      reqs.appendChild(el("li", {}, [el("span", { class: "dot-bullet navy" }), el("span", { text: r })]));
    });
    var dates = clear("dates");
    if (dates) D.keyDates.forEach(function (d) {
      dates.appendChild(el("div", {}, [el("dt", { text: d[0] }), el("dd", { text: d[1] })]));
    });
  }

  function renderContact() {
    var c = D.contact;
    var addr = $("cAddress"); if (addr) addr.textContent = c.address;
    var em = $("cEmail"); if (em) { em.textContent = c.email; em.href = "mailto:" + encodeURI(c.email); }
    var fb = $("cFacebook"); if (fb) { fb.textContent = c.facebook.replace(/^https?:\/\/(www\.)?/, ""); fb.href = safeUrl(c.facebook); }
    var hrs = $("cHours"); if (hrs) hrs.textContent = c.hours;
    var off = clear("cOffices");
    if (off) c.offices.forEach(function (o) {
      off.appendChild(el("li", {}, [
        el("p", { class: "n", text: o.name }),
        o.email ? el("p", { class: "l" }, [el("span", { html: ICON.mail }), o.email]) : null,
        o.phone ? el("p", { class: "l" }, [el("span", { html: ICON.phone }), o.phone]) : null,
      ]));
    });
    // office dropdown in the inquiry form (keeps whatever the visitor already picked)
    var sel = $("office");
    if (sel) {
      var keep = sel.value;
      sel.innerHTML = "";
      c.offices.forEach(function (o) { sel.appendChild(el("option", { value: o.name, text: o.name })); });
      if (keep) sel.value = keep;
    }
  }

  /* ---------- boot: load admin-edited content, then draw the page ---------- */
  var page = document.body.getAttribute("data-page");
  var map = { home: renderHome, about: renderAbout, programs: renderPrograms, course: renderCourse, news: renderNews, admissions: renderAdmissions, contact: renderContact };
  var lastStamp = null;

  function apply(res) {
    D = window.KHS = window.Store.content.merge(window.KHS_DEFAULTS, (res && res.content) || {});
    lastStamp = (res && res.updatedAt) || 0;
  }
  function draw() {
    buildHeader();
    buildFooter();
    if (map[page]) map[page]();
  }

  // pages wait for this (forms.js uses it) so the course list is always current
  window.KHS_READY = window.Store.content.get()
    .catch(function () { return { content: {}, updatedAt: 0 }; })
    .then(function (res) {
      apply(res);
      draw();
      watch();
    });

  // Pick up changes made in the Admin Portal without the visitor reloading:
  //  - instantly when the admin edits in another tab of the same browser
  //  - every 30 seconds / when the tab becomes visible, for everybody else
  function refresh() {
    window.Store.content.get().then(function (res) {
      if ((res.updatedAt || 0) === lastStamp) return;
      apply(res);
      draw();
    }).catch(function () { /* offline: keep what we have */ });
  }
  function watch() {
    window.Store.content.onChange(refresh);
    window.Store.mode().then(function (mode) {
      if (mode === "server") setInterval(refresh, 30000);
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
  }

  buildHeader(); // header has no editable content, so draw it right away (no flash)

  window.KHS_UI = { el: el, $: $ };
})();
