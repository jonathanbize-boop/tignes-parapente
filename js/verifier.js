/* Tignes Parapente — vérification des bons cadeaux (espace moniteur) */
(function () {
  "use strict";

  var stateEl = document.getElementById("verify-state");
  var manualForm = document.getElementById("manual-form");
  var manualInput = document.getElementById("m-link");
  var adminZone = document.getElementById("admin-zone");
  var adminToken = document.getElementById("admin-token");
  var redeemBtn = document.getElementById("redeem-btn");
  var redeemError = document.getElementById("redeem-error");

  var current = { code: null, sig: null };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fmtDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("fr-FR"); } catch (e) { return d; }
  }

  function render(data) {
    stateEl.className = "verify-card";
    var html = "";
    if (data.status === "valid") {
      stateEl.classList.add("verify-ok");
      html =
        '<div class="verify-badge">✓ Bon valide</div>' +
        '<dl>' +
        '<dt>Vol</dt><dd>' + esc(data.flightName) + '</dd>' +
        '<dt>Bénéficiaire</dt><dd>' + esc(data.recipientName || "—") + '</dd>' +
        '<dt>Émis le</dt><dd>' + fmtDate(data.createdAt) + '</dd>' +
        '<dt>Code</dt><dd>' + esc(current.code) + '</dd>' +
        '</dl>';
      adminZone.hidden = false;
    } else if (data.status === "used") {
      stateEl.classList.add("verify-used");
      html =
        '<div class="verify-badge">⚠ Bon déjà utilisé</div>' +
        '<dl>' +
        '<dt>Vol</dt><dd>' + esc(data.flightName) + '</dd>' +
        '<dt>Bénéficiaire</dt><dd>' + esc(data.recipientName || "—") + '</dd>' +
        '<dt>Utilisé le</dt><dd>' + fmtDate(data.redeemedAt) + '</dd>' +
        '<dt>Code</dt><dd>' + esc(current.code) + '</dd>' +
        '</dl>';
      adminZone.hidden = true;
    } else {
      stateEl.classList.add("verify-bad");
      html =
        '<div class="verify-badge">✗ Bon non valide</div>' +
        '<p>' + esc(data.reason || "Ce bon n'est pas authentique ou n'existe pas.") + '</p>';
      adminZone.hidden = true;
    }
    stateEl.innerHTML = html;
  }

  function verify(code, sig) {
    current.code = code;
    current.sig = sig;
    stateEl.className = "verify-card verify-loading";
    stateEl.innerHTML = "<p>Vérification en cours…</p>";
    fetch("/api/voucher?c=" + encodeURIComponent(code) + "&s=" + encodeURIComponent(sig))
      .then(function (r) { return r.json(); })
      .then(render)
      .catch(function () {
        stateEl.className = "verify-card verify-bad";
        stateEl.innerHTML = '<div class="verify-badge">Erreur</div><p>Connexion impossible. Réessayez.</p>';
      });
  }

  function parseFromUrl(url) {
    try {
      var u = new URL(url, window.location.origin);
      return { c: u.searchParams.get("c"), s: u.searchParams.get("s") };
    } catch (e) { return { c: null, s: null }; }
  }

  // Au chargement : lit ?c & ?s (QR scanné)
  var params = new URLSearchParams(window.location.search);
  var c = params.get("c");
  var s = params.get("s");
  if (c && s) {
    manualForm.hidden = true;
    verify(c, s);
  } else {
    stateEl.className = "verify-card";
    stateEl.innerHTML =
      '<div class="verify-badge">Scannez un bon</div>' +
      "<p>Scannez le QR code d'un bon cadeau avec l'appareil photo, ou collez son lien ci-dessous.</p>";
    manualForm.hidden = false;
  }

  manualForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var parsed = parseFromUrl(manualInput.value.trim());
    if (parsed.c && parsed.s) {
      manualForm.hidden = true;
      verify(parsed.c, parsed.s);
    } else {
      manualInput.focus();
    }
  });

  // Code admin mémorisé
  try {
    var saved = localStorage.getItem("tp_admin_token");
    if (saved) adminToken.value = saved;
  } catch (e) {}

  redeemBtn.addEventListener("click", function () {
    redeemError.hidden = true;
    var token = adminToken.value.trim();
    if (!token) { adminToken.focus(); return; }
    try { localStorage.setItem("tp_admin_token", token); } catch (e) {}

    redeemBtn.disabled = true;
    var original = redeemBtn.textContent;
    redeemBtn.textContent = "Validation…";

    fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: current.code, s: current.sig, token: token }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d && res.d.ok) {
          verify(current.code, current.sig); // rafraîchit → "déjà utilisé"
        } else {
          redeemError.textContent = (res.d && res.d.error) || "Échec de la validation.";
          redeemError.hidden = false;
          redeemBtn.disabled = false;
          redeemBtn.textContent = original;
        }
      })
      .catch(function () {
        redeemError.textContent = "Connexion impossible. Réessayez.";
        redeemError.hidden = false;
        redeemBtn.disabled = false;
        redeemBtn.textContent = original;
      });
  });
})();
