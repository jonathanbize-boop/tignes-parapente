/* Tignes Parapente — interactions */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header : fond au scroll */
  var header = document.querySelector(".site-header");
  function onScrollHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* Menu mobile */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
        toggle.focus();
      }
    });
  }

  /* Apparitions au scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Altimètre : l'altitude grimpe avec le scroll (2 100 m lac -> 2 704 m Tovière) */
  var altEl = document.querySelector(".altimeter .alt-value");
  if (altEl && !prefersReduced) {
    var MIN = 2100, MAX = 2704, ticking = false;
    function updateAlt() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      var alt = Math.round(MIN + (MAX - MIN) * p);
      altEl.textContent = alt.toLocaleString("fr-FR") + " m";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(updateAlt); ticking = true; }
    }, { passive: true });
    updateAlt();
  }

  /* FAQ : un seul item ouvert à la fois */
  var faqItems = document.querySelectorAll(".faq-list .faq-item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) { other.open = false; }
        });
      }
    });
  });

  /* Pré-remplissage du formulaire de contact depuis l'URL
     (ex. contact.html?vol=Vol%20Découverte&cadeau=1#reservation) */
  var volSelect = document.getElementById("f-vol");
  if (volSelect) {
    var params = new URLSearchParams(window.location.search);
    var vol = params.get("vol");
    var isGift = params.get("cadeau") === "1";
    if (vol) {
      Array.prototype.forEach.call(volSelect.options, function (opt) {
        if (opt.text.indexOf(vol) === 0) { volSelect.value = opt.value || opt.text; opt.selected = true; }
      });
    }
    if (isGift) {
      var msg = document.getElementById("f-msg");
      if (msg && !msg.value) {
        msg.value = "Bonjour, je souhaite offrir ce vol en bon cadeau" +
          (vol ? " (" + vol + ")" : "") + ".";
      }
    }
  }

  /* Formulaires (sans backend) : ouverture du mail pré-rempli */
  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) { return; }
      var to = form.getAttribute("data-mailto");
      var subject = form.getAttribute("data-subject") || "Demande de réservation";
      var lines = [];
      form.querySelectorAll("input, select, textarea").forEach(function (f) {
        if (f.name && f.value) { lines.push(f.name + " : " + f.value); }
      });
      window.location.href = "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      var ok = form.querySelector(".form-success");
      if (ok) { ok.hidden = false; }
    });
  });
})();
