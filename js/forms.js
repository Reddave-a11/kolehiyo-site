/* ==========================================================
   Forms — validation + submit for the Application form
   (admissions.html) and the Inquiry form (contact.html).
   ========================================================== */
(window.KHS_READY || Promise.resolve()).then(function () {
  "use strict";
  var el = window.KHS_UI.el;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

  var RULES = {
    application: {
      fullName: { label: "Full name", required: true, min: 2, max: 120 },
      email: { label: "Email", required: true, email: true, max: 120 },
      phone: { label: "Mobile number", required: true, phone: true },
      birthdate: { label: "Date of birth", required: true, date: true },
      address: { label: "Home address", required: true, min: 3, max: 200 },
      lastSchool: { label: "Last school attended", required: true, min: 2, max: 150 },
      program: { label: "First choice program", required: true, max: 100 },
      program2: { label: "Second choice", required: false, max: 100 },
      resident: { label: "Residency", required: true, max: 3 },
      message: { label: "Message", required: false, max: 1000 },
    },
    inquiry: {
      fullName: { label: "Full name", required: true, min: 2, max: 120 },
      email: { label: "Email", required: true, email: true, max: 120 },
      phone: { label: "Phone", required: false, phone: true },
      office: { label: "Office", required: true, max: 100 },
      subject: { label: "Subject", required: true, min: 2, max: 150 },
      message: { label: "Message", required: true, min: 5, max: 2000 },
    },
  };

  function validateField(rule, value) {
    var v = (value || "").trim();
    if (!v) return rule.required ? rule.label + " is required." : "";
    if (rule.min && v.length < rule.min) return rule.label + " is too short.";
    if (rule.max && v.length > rule.max) return rule.label + " is too long (max " + rule.max + " characters).";
    if (rule.email && !EMAIL_RE.test(v)) return "Please enter a valid email address.";
    if (rule.phone && !PHONE_RE.test(v)) return "Please enter a valid phone number.";
    if (rule.date) {
      var d = new Date(v);
      var now = new Date();
      if (isNaN(d.getTime())) return "Please enter a valid date.";
      var age = (now - d) / (365.25 * 24 * 3600 * 1000);
      if (age < 14 || age > 90) return "Please check your date of birth.";
    }
    return "";
  }

  function setError(form, name, msg) {
    var field = form.querySelector('[data-field="' + name + '"]');
    if (!field) return;
    var input = field.querySelector("input, select, textarea");
    var box = field.querySelector(".err");
    if (box) box.textContent = msg || "";
    if (input && input.type !== "radio" && input.type !== "checkbox") input.classList.toggle("invalid", !!msg);
  }

  function readValue(form, name) {
    var radios = form.querySelectorAll('input[type="radio"][name="' + name + '"]');
    if (radios.length) {
      var checked = form.querySelector('input[type="radio"][name="' + name + '"]:checked');
      return checked ? checked.value : "";
    }
    var f = form.elements[name];
    return f ? f.value : "";
  }

  function initForm(formId, type) {
    var form = document.getElementById(formId);
    if (!form) return;
    var rules = RULES[type];
    var msg = form.querySelector(".form-msg");
    var btn = form.querySelector('button[type="submit"]');

    // live re-validation after the first blur
    Object.keys(rules).forEach(function (name) {
      var f = form.elements[name];
      if (!f || !f.tagName) return; // radio groups are checked on submit
      f.addEventListener("blur", function () { setError(form, name, validateField(rules[name], f.value)); });
      f.addEventListener("input", function () { if (f.classList.contains("invalid")) setError(form, name, validateField(rules[name], f.value)); });
    });

    // radios / checkbox: clear their error as soon as the user fixes them
    form.addEventListener("change", function (e) {
      var t = e.target;
      if (t.type !== "radio" && t.type !== "checkbox") return;
      var box = t.closest("[data-field]");
      var err = box && box.querySelector(".err");
      if (err) err.textContent = "";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.hidden = true;

      // honeypot: real people never fill this in
      if (form.elements.website && form.elements.website.value) return;

      var data = {}, firstBad = null;
      Object.keys(rules).forEach(function (name) {
        var val = readValue(form, name).trim();
        var err = validateField(rules[name], val);
        setError(form, name, err);
        if (err && !firstBad) firstBad = name;
        data[name] = val;
      });

      if (type === "application") {
        var consent = form.elements.consent;
        var cErr = form.querySelector('[data-field="consent"] .err');
        if (!consent.checked) { cErr.textContent = "Please agree to the data privacy notice to continue."; if (!firstBad) firstBad = "consent"; }
        else cErr.textContent = "";
        data.consent = consent.checked ? "Yes" : "No";
      }

      if (firstBad) {
        var target = form.querySelector('[data-field="' + firstBad + '"] input, [data-field="' + firstBad + '"] select, [data-field="' + firstBad + '"] textarea');
        if (target) target.focus();
        return;
      }

      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = "Submitting…";

      window.Store.submit(type, data)
        .then(function (res) { showSuccess(form, type, res.ref); })
        .catch(function (err) {
          msg.textContent = err.message || "Something went wrong. Please try again.";
          msg.hidden = false;
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  }

  function showSuccess(form, type, ref) {
    var card = form.closest(".form-card");
    var isApp = type === "application";
    var box = el("div", { class: "success-box", role: "status" }, [
      el("div", { class: "tick", text: "✓" }),
      el("h3", { text: isApp ? "Application received" : "Message sent" }),
      el("p", {
        text: isApp
          ? "Thank you! Your application has been submitted. Please keep your reference number and bring your requirements to the Office of Admissions."
          : "Thank you for reaching out. The office will reply to the email address you provided.",
      }),
      el("div", { class: "ref", text: ref }),
      el("div", {}, [
        el("a", { href: isApp ? "programs.html" : "index.html", class: "btn btn-navy", style: "padding:0.75rem 1.5rem", text: isApp ? "Explore programs" : "Back to home" }),
      ]),
    ]);
    card.innerHTML = "";
    card.appendChild(box);
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------- page-specific setup ---------- */
  var appForm = document.getElementById("applyForm");
  if (appForm) {
    var D = window.KHS;
    ["program", "program2"].forEach(function (id) {
      var sel = appForm.elements[id];
      D.courses.forEach(function (c) { sel.appendChild(el("option", { value: c.name, text: c.name })); });
    });
    // arrive from a course page with ?program=slug → preselect it
    var slug = new URLSearchParams(location.search).get("program");
    var match = D.courses.filter(function (c) { return c.slug === slug; })[0];
    if (match) appForm.elements.program.value = match.name;
    // birthdate can't be in the future
    appForm.elements.birthdate.max = new Date().toISOString().slice(0, 10);
    initForm("applyForm", "application");
  }
  initForm("inquiryForm", "inquiry");
});
