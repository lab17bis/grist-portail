/* Générateur de configuration du portail : formulaire -> lien et JSON. */
(function () {
  "use strict";

  var OUTILS = [
    ["carte", "Carte"], ["graphe", "Graphe"], ["consultation", "Consultation"],
    ["reunion", "Réunions"], ["management", "Management visuel"], ["projets", "Suivi de projets"]
  ];
  var GP = window.GristPublic;
  var onglets = [{ titre: "", mode: "adresse", adresse: "" }];
  var ZONE = document.getElementById("cf-onglets");
  var $ = function (id) { return document.getElementById(id); };

  function esc(t) {
    return String(t === null || t === undefined ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function dessinerOnglets() {
    ZONE.innerHTML = onglets.map(function (o, i) {
      var modeDoc = o.mode === "outil";
      return "<div class=\"pe-ligne\" data-i=\"" + i + "\">" +
        "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"cf-o" + i + "-titre\">Titre de la page</label><input class=\"fr-input\" id=\"cf-o" + i + "-titre\" data-champ=\"titre\" type=\"text\" value=\"" + esc(o.titre) + "\"></div>" +
        "<div class=\"fr-select-group\"><label class=\"fr-label\" for=\"cf-o" + i + "-mode\">Désignation</label><select class=\"fr-select\" id=\"cf-o" + i + "-mode\" data-champ=\"mode\">" +
          "<option value=\"adresse\"" + (modeDoc ? "" : " selected") + ">Lien de la page publique de l'outil</option>" +
          "<option value=\"outil\"" + (modeDoc ? " selected" : "") + ">Outil et document Grist</option></select></div>" +
        (modeDoc ?
          "<div class=\"fr-select-group\"><label class=\"fr-label\" for=\"cf-o" + i + "-outil\">Outil</label><select class=\"fr-select\" id=\"cf-o" + i + "-outil\" data-champ=\"outil\">" +
            OUTILS.map(function (t) { return "<option value=\"" + t[0] + "\"" + (o.outil === t[0] ? " selected" : "") + ">" + t[1] + "</option>"; }).join("") + "</select></div>" +
          "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"cf-o" + i + "-lien\">Lien du document Grist partagé en lecture publique</label><input class=\"fr-input\" id=\"cf-o" + i + "-lien\" data-champ=\"lien\" type=\"text\" value=\"" + esc(o.lien || "") + "\"></div>" +
          "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"cf-o" + i + "-table\">Table<span class=\"fr-hint-text\">Pour la carte et le graphe. Laissez vide pour les autres outils.</span></label><input class=\"fr-input\" id=\"cf-o" + i + "-table\" data-champ=\"table\" type=\"text\" value=\"" + esc(o.table || "") + "\"></div>"
        :
          "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"cf-o" + i + "-adresse\">Lien de la page publique<span class=\"fr-hint-text\">Copié depuis l'onglet Publication de l'outil.</span></label><input class=\"fr-input\" id=\"cf-o" + i + "-adresse\" data-champ=\"adresse\" type=\"text\" value=\"" + esc(o.adresse || "") + "\"></div>") +
        "<ul class=\"fr-btns-group fr-btns-group--inline fr-btns-group--sm\">" +
          "<li><button type=\"button\" class=\"fr-btn fr-btn--tertiary\" data-act=\"haut\"" + (i === 0 ? " disabled" : "") + ">Monter</button></li>" +
          "<li><button type=\"button\" class=\"fr-btn fr-btn--tertiary\" data-act=\"bas\"" + (i === onglets.length - 1 ? " disabled" : "") + ">Descendre</button></li>" +
          "<li><button type=\"button\" class=\"fr-btn fr-btn--tertiary\" data-act=\"suppr\">Supprimer</button></li></ul></div>";
    }).join("");
  }

  function configuration() {
    var logoSrc = $("cf-logo").value.trim();
    var page = { titre: $("cf-titre").value.trim(), marque: $("cf-marque").checked ? "République\nfrançaise" : "" };
    if ($("cf-sous").value.trim()) { page.sousTitre = $("cf-sous").value.trim(); }
    if (logoSrc) { page.logo = { src: logoSrc, alt: $("cf-alt").value.trim(), hauteur: 3 }; }
    if ($("cf-pied").value.trim()) { page.pied = { texte: $("cf-pied").value.trim(), accessibilite: "" }; }
    var c = { page: page };
    if ($("cf-acc-titre").value.trim() || $("cf-acc-texte").value.trim()) {
      c.accueil = { titre: $("cf-acc-titre").value.trim(), texte: $("cf-acc-texte").value.trim() };
    }
    c.onglets = onglets.map(function (o) {
      if (o.mode === "outil") {
        var r = { titre: o.titre, outil: o.outil || "carte", lien: (o.lien || "").trim() };
        if ((o.table || "").trim()) { r.table = o.table.trim(); }
        return r;
      }
      return { titre: o.titre, adresse: (o.adresse || "").trim() };
    }).filter(function (o) { return o.adresse || o.lien; });
    return c;
  }

  function actualiser(ecrireJson) {
    var c = configuration();
    var base = location.href.split("?")[0].split("#")[0].replace(/configurer\.html$/, "index.html");
    var lien = base + "?c=" + GP.encoder(c);
    $("cf-lien").value = lien;
    $("cf-ouvrir").setAttribute("href", lien);
    if (ecrireJson) { $("cf-json").value = JSON.stringify(c, null, 2); }
    $("cf-avis").textContent = lien.length > 2000 ? "Lien long (" + lien.length + " caractères) : certains services de messagerie le coupent. Enregistrez plutôt la configuration dans config.json ou dans un document Grist." : "";
  }

  function charger(c) {
    c = c || {};
    var p = c.page || {};
    $("cf-titre").value = p.titre || "";
    $("cf-sous").value = p.sousTitre || "";
    $("cf-marque").checked = p.marque !== "";
    $("cf-logo").value = (p.logo && p.logo.src) || "";
    $("cf-alt").value = (p.logo && p.logo.alt) || "";
    $("cf-pied").value = (p.pied && p.pied.texte) || "";
    $("cf-acc-titre").value = (c.accueil && c.accueil.titre) || "";
    $("cf-acc-texte").value = (c.accueil && c.accueil.texte) || "";
    onglets = (c.onglets || []).map(function (o) {
      return o.adresse || !o.outil ? { titre: o.titre || "", mode: "adresse", adresse: o.adresse || "" } :
        { titre: o.titre || "", mode: "outil", outil: o.outil, lien: o.lien || "", table: o.table || "" };
    });
    if (!onglets.length) { onglets = [{ titre: "", mode: "adresse", adresse: "" }]; }
    dessinerOnglets();
    actualiser(true);
  }

  function copier(texte, message) {
    var fin = function () { $("cf-etat").textContent = message; };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(texte).then(fin, function () { $("cf-etat").textContent = "Copie impossible : sélectionnez le texte et copiez-le."; }); }
    else { $("cf-etat").textContent = "Copie impossible : sélectionnez le texte et copiez-le."; }
  }

  ZONE.addEventListener("input", function (e) {
    var ligne = e.target.closest("[data-i]"), champ = e.target.getAttribute("data-champ");
    if (!ligne || !champ) { return; }
    var o = onglets[Number(ligne.getAttribute("data-i"))];
    o[champ] = e.target.value;
    if (champ === "mode") { if (!o.outil) { o.outil = "carte"; } dessinerOnglets(); }
    actualiser(true);
  });
  ZONE.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"), ligne = e.target.closest("[data-i]");
    if (!b || !ligne) { return; }
    var i = Number(ligne.getAttribute("data-i")), a = b.getAttribute("data-act");
    if (a === "suppr") { onglets.splice(i, 1); }
    if (a === "haut" && i > 0) { onglets.splice(i - 1, 0, onglets.splice(i, 1)[0]); }
    if (a === "bas" && i < onglets.length - 1) { onglets.splice(i + 1, 0, onglets.splice(i, 1)[0]); }
    dessinerOnglets();
    actualiser(true);
  });
  $("cf-ajouter").addEventListener("click", function () { onglets.push({ titre: "", mode: "adresse", adresse: "" }); dessinerOnglets(); actualiser(true); });
  ["cf-titre", "cf-sous", "cf-marque", "cf-logo", "cf-alt", "cf-pied", "cf-acc-titre", "cf-acc-texte"].forEach(function (id) {
    $(id).addEventListener("input", function () { actualiser(true); });
    $(id).addEventListener("change", function () { actualiser(true); });
  });
  $("cf-fichier").addEventListener("change", function () {
    window.PageDSFR.lireImage($("cf-fichier").files[0]).then(function (d) { $("cf-logo").value = d; actualiser(true); $("cf-etat").textContent = "Logo chargé."; })
      .catch(function (e) { $("cf-etat").textContent = e.message; });
  });
  $("cf-copier-lien").addEventListener("click", function () { copier($("cf-lien").value, "Lien copié."); });
  $("cf-copier-json").addEventListener("click", function () { copier($("cf-json").value, "Configuration copiée."); });
  $("cf-charger").addEventListener("click", function () {
    try { charger(JSON.parse($("cf-json").value)); $("cf-etat").textContent = "Configuration chargée."; }
    catch (e) { $("cf-etat").textContent = "JSON illisible : " + e.message; }
  });

  window.PageDSFR.appliquer({ marque: "République\nfrançaise", titre: "Configurer le portail", pied: { accessibilite: "" } }, { entete: $("entete"), pied: $("pied"), accueil: "index.html" });
  // Reprise d'une configuration : ?c=… dans l'adresse.
  var reprise = new URLSearchParams(location.search).get("c");
  charger(reprise ? GP.decoder(reprise) : null);
})();
