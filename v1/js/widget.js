/*
 * Portail, dans Grist : configurateur du portail (widget personnalisé).
 *
 * Une seule page à onglets, comme les autres widgets : le portail tel qu'il s'affichera (Portail),
 * ses pages (Pages), l'en-tête et le pied de page, l'aperçu complet, la publication.
 *
 * Les pages du portail sont les lignes de la table Portail_Onglets ; les réglages de la page
 * (en-tête, pied, accueil, lien de publication) sont en JSON dans la description de la colonne Config_portail.
 * La page publique du portail est index.html : elle lit la même table, dans un document partagé en lecture publique.
 */
(function () {
  "use strict";

  var TABLE = "Portail_Onglets", COL = "Config_portail";
  var COLONNES = [["Titre", "Text"], ["Outil", "Text"], ["Lien", "Text"], ["Table", "Text"], ["Adresse", "Text"],
    ["Options", "Text"], ["Mappings", "Text"], ["Ordre", "Numeric"], ["Actif", "Bool"], [COL, "Text"]];
  var OUTILS = [["carte", "Carte"], ["graphe", "Graphe"], ["consultation", "Consultation"], ["reunion", "Réunions"],
    ["management", "Management visuel"], ["projets", "Suivi de projets"]];
  var GP = window.GristPublic;
  var PAGE_DEFAUT = { marque: "République\nfrançaise", titre: "Portail", pied: { accessibilite: "" } };

  var app = document.getElementById("po-app");
  var coque = document.getElementById("po-coque");
  var meta = { tables: [], colonnes: [] };
  var lignes = [];
  var reglages = {};
  var brouillon = null;      // { page, accueil, publication, pages: [...] }
  var configLab = null;
  var existe = false;
  var cadreSrc = "";

  function esc(t) {
    return String(t === null || t === undefined ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function copie(o) { return JSON.parse(JSON.stringify(o)); }
  function lignesDepuisColonnes(cols) {
    var ids = cols.id || [], cles = Object.keys(cols), res = [];
    for (var i = 0; i < ids.length; i++) { var l = {}; cles.forEach(function (k) { l[k] = cols[k][i]; }); res.push(l); }
    return res;
  }
  function analyser(t) { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } }

  // ---------------------------------------------------------------------------
  // Chargement
  // ---------------------------------------------------------------------------

  function charger() {
    return Promise.all([grist.docApi.fetchTable("_grist_Tables"), grist.docApi.fetchTable("_grist_Tables_column")]).then(function (m) {
      var tables = lignesDepuisColonnes(m[0]), cols = lignesDepuisColonnes(m[1]);
      meta.tables = tables; meta.colonnes = cols;
      var t = tables.filter(function (x) { return x.tableId === TABLE; })[0];
      existe = !!t;
      if (!t) { lignes = []; reglages = {}; return null; }
      var c = cols.filter(function (x) { return x.parentId === t.id && x.colId === COL; })[0];
      reglages = analyser(c && c.description) || {};
      return grist.docApi.fetchTable(TABLE).then(function (r) { lignes = lignesDepuisColonnes(r); });
    });
  }
  function aColonne(nom) {
    var t = meta.tables.filter(function (x) { return x.tableId === TABLE; })[0];
    return !!(t && meta.colonnes.some(function (x) { return x.parentId === t.id && x.colId === nom; }));
  }

  // Brouillon : copie de travail, modifiée par les onglets, écrite dans Grist à l'enregistrement.
  function nouveauBrouillon() {
    var pages = lignes.slice().sort(function (a, b) { return (a.Ordre || 0) - (b.Ordre || 0) || a.id - b.id; }).map(function (l) {
      return { id: l.id, titre: l.Titre || "", mode: l.Adresse ? "adresse" : "outil", outil: l.Outil || "carte", lien: l.Lien || "", table: l.Table || "",
        adresse: l.Adresse || "", options: l.Options || "", mappings: l.Mappings || "", actif: l.Actif !== false };
    });
    var b = { page: Object.assign(copie(PAGE_DEFAUT), copie(reglages.page || {})), accueil: Object.assign({ titre: "", texte: "" }, reglages.accueil || {}),
      publication: copie(reglages.publication || {}), pages: pages };
    b.page.pied = Object.assign({ accessibilite: "" }, b.page.pied || {});
    return b;
  }

  // Configuration au format du portail (index.html ?c=…), à partir du brouillon.
  function configurationPortail(b) {
    var c = { page: b.page, onglets: [] };
    if (b.accueil && (b.accueil.titre || b.accueil.texte)) { c.accueil = b.accueil; }
    b.pages.forEach(function (p) {
      var o = { titre: p.titre };
      if (p.mode === "adresse") { o.adresse = p.adresse; } else { o.outil = p.outil; o.lien = p.lien; if (p.table) { o.table = p.table; } }
      var op = analyser(p.options), mp = analyser(p.mappings);
      if (op) { o.options = op; }
      if (mp) { o.mappings = mp; }
      if (!p.actif) { o.actif = false; }
      c.onglets.push(o);
    });
    return c;
  }
  function adressePortail(integre) {
    var base = new URL("index.html", location.href);
    var q = new URLSearchParams();
    q.set("c", GP.encoder(configurationPortail(brouillon)));
    if (integre) { q.set("integre", "1"); }
    return base.origin + base.pathname + "?" + q.toString();
  }

  // ---------------------------------------------------------------------------
  // Vue : le portail tel qu'il s'affiche (configuration en cours)
  // ---------------------------------------------------------------------------

  function dessinerVue() {
    var src = adressePortail(true);
    if (src === cadreSrc && app.querySelector("iframe")) { return; }
    cadreSrc = src;
    app.innerHTML = "<iframe class=\"po-cadre-vue\" title=\"Portail\" src=\"" + esc(src) + "\" sandbox=\"allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads\"></iframe>";
    ajusterVue();
  }
  function ajusterVue() {
    var f = app.querySelector("iframe");
    if (f) { f.style.height = Math.max(560, window.innerHeight - f.getBoundingClientRect().top - 8) + "px"; }
  }
  window.addEventListener("resize", ajusterVue);

  // ---------------------------------------------------------------------------
  // Onglet Pages
  // ---------------------------------------------------------------------------

  function champ(id, lib, val, o) {
    o = o || {};
    var aide = o.aide ? "<span class=\"fr-hint-text\">" + esc(o.aide) + "</span>" : "";
    var saisie = o.multiligne
      ? "<textarea class=\"fr-input\" id=\"" + id + "\" rows=\"" + (o.lignes || 4) + "\" " + (o.attrs || "") + ">" + esc(val) + "</textarea>"
      : "<input class=\"fr-input\" id=\"" + id + "\" type=\"text\" value=\"" + esc(val) + "\" " + (o.attrs || "") + ">";
    return "<div class=\"fr-input-group\"><label class=\"fr-label\" for=\"" + id + "\">" + esc(lib) + aide + "</label>" + saisie + "</div>";
  }

  function ficheDePage(p, i, n) {
    var h = "<div class=\"po-page-fiche\"><h3 class=\"fr-h6\">Page " + (i + 1) + (p.titre ? " : " + esc(p.titre) : "") + "</h3><div class=\"po-grille\">" +
      champ("pg-titre-" + i, "Titre dans le menu", p.titre, { attrs: "data-i=\"" + i + "\" data-k=\"titre\"" }) +
      "<div class=\"fr-select-group\"><label class=\"fr-label\" for=\"pg-mode-" + i + "\">Ce que la page affiche</label><select class=\"fr-select\" id=\"pg-mode-" + i + "\" data-i=\"" + i + "\" data-k=\"mode\">" +
      "<option value=\"outil\"" + (p.mode === "outil" ? " selected" : "") + ">La page publique d'un outil, dans un document Grist</option>" +
      "<option value=\"adresse\"" + (p.mode === "adresse" ? " selected" : "") + ">Une adresse de page publique</option></select></div>";
    if (p.mode === "outil") {
      h += "<div class=\"fr-select-group\"><label class=\"fr-label\" for=\"pg-outil-" + i + "\">Outil</label><select class=\"fr-select\" id=\"pg-outil-" + i + "\" data-i=\"" + i + "\" data-k=\"outil\">" +
        OUTILS.map(function (o) { return "<option value=\"" + o[0] + "\"" + (o[0] === p.outil ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>" +
        champ("pg-lien-" + i, "Lien du document Grist partagé en lecture publique", p.lien, { attrs: "data-i=\"" + i + "\" data-k=\"lien\" placeholder=\"https://…\"" }) +
        ((p.outil === "carte" || p.outil === "graphe") ? champ("pg-table-" + i, "Table à afficher", p.table, { attrs: "data-i=\"" + i + "\" data-k=\"table\"" }) : "");
    } else {
      h += champ("pg-adresse-" + i, "Adresse de la page publique", p.adresse, { attrs: "data-i=\"" + i + "\" data-k=\"adresse\" placeholder=\"https://…\"",
        aide: "Copiée depuis l'onglet Publication de l'outil. Par exemple, l'adresse publique d'un questionnaire pour proposer une page de vote." });
    }
    h += "</div><div class=\"fr-checkbox-group fr-checkbox-group--sm\"><input type=\"checkbox\" id=\"pg-actif-" + i + "\" data-i=\"" + i + "\" data-k=\"actif\"" + (p.actif ? " checked" : "") + ">" +
      "<label class=\"fr-label\" for=\"pg-actif-" + i + "\">Afficher cette page dans le menu</label></div>" +
      "<details class=\"fr-mt-1w\"><summary class=\"fr-text--sm\">Réglages avancés (JSON)</summary>" +
      champ("pg-options-" + i, "Options", p.options, { multiligne: true, lignes: 3, attrs: "data-i=\"" + i + "\" data-k=\"options\"", aide: "Réglages d'affichage de l'outil, facultatif." }) +
      champ("pg-mappings-" + i, "Correspondance des colonnes", p.mappings, { multiligne: true, lignes: 3, attrs: "data-i=\"" + i + "\" data-k=\"mappings\"" }) + "</details>" +
      "<div class=\"po-barre\"><button type=\"button\" class=\"fr-btn fr-btn--sm fr-btn--tertiary\" data-act=\"monter\" data-i=\"" + i + "\"" + (i === 0 ? " disabled" : "") + ">Monter</button>" +
      "<button type=\"button\" class=\"fr-btn fr-btn--sm fr-btn--tertiary\" data-act=\"descendre\" data-i=\"" + i + "\"" + (i === n - 1 ? " disabled" : "") + ">Descendre</button>" +
      "<button type=\"button\" class=\"fr-btn fr-btn--sm fr-btn--tertiary\" data-act=\"retirer\" data-i=\"" + i + "\">Retirer</button></div></div>";
    return h;
  }

  function ongletPages(zone) {
    var b = brouillon;
    var h = "<div class=\"cl-panneau\"><p class=\"fr-text--sm\">Réservé aux personnes qui gèrent le document. Chaque page du portail affiche la page publique d'un outil. " +
      "Le menu n'apparaît que s'il y a au moins deux pages. Pour une consultation publique : une page pour la consultation, une page pour le vote (le questionnaire branché sur la table des votes).</p>" +
      "<h2 class=\"fr-h5\">Page d'accueil</h2><p class=\"fr-text--sm\">Facultative : laissez vide pour ouvrir directement sur la première page.</p>" +
      champ("ac-titre", "Titre", b.accueil.titre, { attrs: "data-ac=\"titre\"" }) +
      champ("ac-texte", "Texte", b.accueil.texte, { multiligne: true, lignes: 4, attrs: "data-ac=\"texte\"", aide: "Une ligne vide sépare deux paragraphes." }) +
      "<h2 class=\"fr-h5 fr-mt-3w\">Pages du menu</h2>";
    if (!b.pages.length) { h += "<p class=\"fr-text--sm\"><em>Aucune page pour l'instant.</em></p>"; }
    b.pages.forEach(function (p, i) { h += ficheDePage(p, i, b.pages.length); });
    h += "<button type=\"button\" class=\"fr-btn fr-icon-add-line fr-btn--icon-left\" data-act=\"ajouter\">Ajouter une page</button></div>";
    zone.innerHTML = h;
    brancherPages(zone);
  }

  function modifie() { if (configLab) { configLab.modifie(true); } }
  function redessinerPages() { if (zonePages) { ongletPages(zonePages); } }
  var zonePages = null;
  function brancherPages(zone) {
    zonePages = zone;
    if (zone.__brancheP) { return; }
    zone.__brancheP = true;
    function maj(e) {
      var t = e.target, b = brouillon;
      if (t.hasAttribute("data-ac")) { b.accueil[t.getAttribute("data-ac")] = t.value; modifie(); return; }
      if (!t.hasAttribute("data-k")) { return; }
      var p = b.pages[+t.getAttribute("data-i")], k = t.getAttribute("data-k");
      if (!p) { return; }
      p[k] = t.type === "checkbox" ? t.checked : t.value;
      modifie();
      if (e.type === "change" && (k === "mode" || k === "outil")) { redessinerPages(); }
    }
    zone.addEventListener("input", function (e) { if (e.target.type !== "checkbox" && e.target.tagName !== "SELECT") { maj(e); } });
    zone.addEventListener("change", maj);
    zone.addEventListener("click", function (e) {
      var bt = e.target.closest("button[data-act]"); if (!bt || bt.disabled) { return; }
      var a = bt.getAttribute("data-act"), i = +bt.getAttribute("data-i"), l = brouillon.pages;
      if (a === "ajouter") { l.push({ id: null, titre: "", mode: "outil", outil: "carte", lien: "", table: "", adresse: "", options: "", mappings: "", actif: true }); }
      else if (a === "retirer") { l.splice(i, 1); }
      else if (a === "monter" && i > 0) { l.splice(i - 1, 0, l.splice(i, 1)[0]); }
      else if (a === "descendre" && i < l.length - 1) { l.splice(i + 1, 0, l.splice(i, 1)[0]); }
      modifie(); redessinerPages();
    });
  }

  // ---------------------------------------------------------------------------
  // Enregistrement
  // ---------------------------------------------------------------------------

  function enregistrer() {
    var b = brouillon, actions = [];
    var vides = b.pages.filter(function (p) { return !String(p.titre).trim(); });
    if (vides.length) { configLab.message("error", "Donnez un titre à chaque page du menu."); return; }
    if (!aColonne(COL)) { actions.push(["AddColumn", TABLE, COL, { type: "Text", label: COL }]); }
    var gardes = {};
    b.pages.forEach(function (p, i) {
      var f = { Titre: String(p.titre).trim(), Outil: p.mode === "outil" ? p.outil : "", Lien: p.mode === "outil" ? String(p.lien).trim() : "",
        Table: p.mode === "outil" ? String(p.table).trim() : "", Adresse: p.mode === "adresse" ? String(p.adresse).trim() : "",
        Options: p.options || "", Mappings: p.mappings || "", Ordre: i + 1, Actif: !!p.actif };
      if (p.id) { gardes[p.id] = true; actions.push(["UpdateRecord", TABLE, p.id, f]); } else { actions.push(["AddRecord", TABLE, null, f]); }
    });
    lignes.forEach(function (l) { if (!gardes[l.id]) { actions.push(["RemoveRecord", TABLE, l.id]); } });
    var cfg = { page: b.page, accueil: b.accueil, publication: b.publication };
    actions.push(["ModifyColumn", TABLE, COL, { description: JSON.stringify(cfg) }]);
    grist.docApi.applyUserActions(actions).then(charger).then(function () {
      var pg = brouillon.page; brouillon = nouveauBrouillon(); brouillon.page = pg;   // l'éditeur d'en-tête et de pied garde son objet
      if (configLab) { configLab.enregistre(); configLab.message("success", "Portail enregistré."); configLab.rafraichir("pages"); }
      dessinerVue();
    }).catch(function (err) {
      if (configLab) { configLab.message("error", "Enregistrement impossible : seules les personnes qui gèrent le document peuvent modifier le portail. (" + ((err && err.message) || err) + ")"); }
    });
  }

  // ---------------------------------------------------------------------------
  // Écran principal et installation
  // ---------------------------------------------------------------------------

  function monter() {
    brouillon = nouveauBrouillon();
    var base = location.href.split("#")[0].split("?")[0];
    configLab = window.ConfigLab.monter(coque, {
      nom: "Portail",
      vue: { libelle: "Portail", element: app },
      page: brouillon.page,
      onglets: [{ id: "pages", libelle: "Pages", rendre: function (zone) { ongletPages(zone); } }],
      surApercu: function (ouvert) { if (ouvert) { dessinerVue(); } },
      surOnglet: function (id) { if (id === "vue") { dessinerVue(); } },
      publication: { mode: "connecte", adresseWidget: base,
        publier: {
          lienDoc: (brouillon.publication && brouillon.publication.lienDoc) || "",
          texte: "Page publique du portail : un menu DSFR qui affiche les pages publiques des outils, sous une seule adresse. Le document doit être partagé en lecture publique, ainsi que les documents des pages affichées.",
          champs: [],
          construire: function (l) { return GP.lien(new URL("index.html", location.href).href, { doc: l }).replace("public=1&", ""); },
          surChangement: function (l) { brouillon.publication = { lienDoc: l }; }
        } },
      surEnregistrer: enregistrer
    });
    dessinerVue();
  }

  function installerEcran() {
    coque.innerHTML = "";
    app.innerHTML = "<div class=\"fr-callout\"><h1 class=\"fr-callout__title fr-h4\">Créer la table du portail</h1>" +
      "<p class=\"fr-callout__text\">Le portail lit ses pages dans une table <code>" + TABLE + "</code> : un titre, un outil, un lien et un ordre par page. Rien d'existant n'est modifié.</p>" +
      "<ul class=\"fr-btns-group fr-btns-group--inline-md\"><li><button type=\"button\" class=\"fr-btn\" id=\"po-installer\">Créer la table</button></li></ul></div>";
    document.getElementById("po-installer").addEventListener("click", function (e) {
      e.target.disabled = true;
      var cols = COLONNES.map(function (c) { return { id: c[0], type: c[1], label: c[0] }; });
      grist.docApi.applyUserActions([["AddTable", TABLE, cols]]).then(demarrer).catch(function (err) {
        e.target.disabled = false;
        app.insertAdjacentHTML("afterbegin", "<div class=\"fr-alert fr-alert--error fr-mb-2w\"><p>Création impossible : " + esc((err && err.message) || err) + "</p></div>");
      });
    });
  }

  function demarrer() {
    return charger().then(function () {
      if (!existe) { installerEcran(); return; }
      monter();
    });
  }

  if (window.self === window.top) {
    app.innerHTML = "<div class=\"fr-callout\"><p class=\"fr-callout__text\">Ce widget se règle dans Grist : ajoutez une vue personnalisée avec cette adresse. La page publique du portail est <a href=\"index.html\">index.html</a>.</p></div>";
    return;
  }
  grist.ready({ requiredAccess: "full", allowSelectBy: false });
  demarrer().catch(function (e) { app.innerHTML = "<div class=\"fr-alert fr-alert--error\"><p>Lecture du document impossible : " + esc((e && e.message) || e) + "</p></div>"; });
})();
