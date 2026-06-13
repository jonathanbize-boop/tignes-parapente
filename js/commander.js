/* Tignes Parapente — tunnel d'achat de bon cadeau */
(function () {
  "use strict";

  var form = document.getElementById("order-form");
  if (!form) return;

  var volSelect = document.getElementById("o-vol");
  var priceEl = document.getElementById("order-price");
  var submit = document.getElementById("order-submit");
  var errorEl = document.getElementById("order-error");

  function selectedOption() {
    return volSelect.options[volSelect.selectedIndex];
  }

  function updatePrice() {
    var p = selectedOption().getAttribute("data-price");
    if (priceEl && p) priceEl.innerHTML = p + "&nbsp;€";
  }

  // Pré-sélection du vol depuis l'URL (?vol=decouverte)
  var params = new URLSearchParams(window.location.search);
  var vol = params.get("vol");
  if (vol) {
    for (var i = 0; i < volSelect.options.length; i++) {
      if (volSelect.options[i].value === vol) { volSelect.selectedIndex = i; break; }
    }
  }
  updatePrice();
  volSelect.addEventListener("change", updatePrice);

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function clearError() {
    if (errorEl) errorEl.hidden = true;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();
    if (!form.reportValidity()) return;

    var payload = {
      flight: volSelect.value,
      recipientName: form.recipientName.value.trim(),
      buyerName: form.buyerName.value.trim(),
      buyerEmail: form.buyerEmail.value.trim(),
      message: form.message.value.trim(),
    };

    submit.disabled = true;
    var original = submit.innerHTML;
    submit.innerHTML = "Redirection vers le paiement…";

    fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d && res.d.url) {
          window.location.href = res.d.url;
        } else {
          showError((res.d && res.d.error) || "Une erreur est survenue. Merci de réessayer.");
          submit.disabled = false;
          submit.innerHTML = original;
        }
      })
      .catch(function () {
        showError("Connexion impossible. Vérifiez votre réseau et réessayez.");
        submit.disabled = false;
        submit.innerHTML = original;
      });
  });
})();
