/*
 * Portail : page DSFR à menu qui intègre les pages publiques des outils Grist.
 *
 * La configuration vient, dans cet ordre, de :
 *   ?c=<configuration encodée>      construite par configurer.html
 *   ?config=<adresse d'un .json>    fichier hébergé (doit autoriser la lecture depuis un autre site)
 *   ?doc=<lien Grist public>        document Grist : table Portail_Onglets + réglages dans la colonne Config_portail
 *   config.json                     fichier voisin de cette page
 *
 * Configuration :
 *   { page: { marque, titre, sousTitre, logo: { src, alt, hauteur }, pied: { texte, liens, mention, accessibilite } },
 *     accueil: { titre, texte },
 *     outils: { carte: "adresse de la page publique de l'outil" },
 *     onglets: [ { titre, outil, lien, table, options, mappings }   outil + document Grist public
 *              | { titre, adresse } ] }                              adresse de page publique copiée depuis l'outil
 */
(function () {
  "use strict";

  // Pages publiques des outils. Remplaçables par la configuration (clé « outils »), par exemple pour un autre hébergement.
  var OUTILS = {
    carte: { libelle: "Carte", page: "https://lab17bis.github.io/grist-carte/v1/index.html" },
    graphe: { libelle: "Graphe", page: "https://lab17bis.github.io/grist-graphe/v1/index.html" },
    consultation: { libelle: "Consultation", page: "https://lab17bis.github.io/grist-consultation/v1/index.html" },
    reunion: { libelle: "Réunions", page: "https://lab17bis.github.io/grist-reunion/v1/public.html" },
    management: { libelle: "Management visuel", page: "https://lab17bis.github.io/grist-management/v1/index.html" },
    projets: { libelle: "Suivi de projets", page: "https://lab17bis.github.io/grist-projet/v1/suivi-projets/index.html" }
  };

  var GP = window.GristPublic;
  var P = new URLSearchParams(location.search);
  var cfg = null;
  var entrees = [];

  function esc(t) {
    return String(t === null || t === undefined ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function erreur(message) {
    var zone = document.getElementById("po-contenu");
    zone.innerHTML = "<div class=\"fr-container fr-my-4w\"><div class=\"fr-alert fr-alert--error\"><p>" + esc(message) + "</p></div></div>";
  }

  // Adresse http(s) uniquement.
  function adresseWeb(u) {
    try {
      var x = new URL(String(u || "").trim(), location.href);
      return /^https?:$/.test(x.protocol) ? x : null;
    } catch (e) { return null; }
  }

  function slug(t) {
    return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
  }

  function json(r) {
    if (!r.ok) { throw new Error("Lecture impossible (erreur " + r.status + ")."); }
    return r.json();
  }

  // ---- Lecture de la configuration ----

  function depuisDocument() {
    var lire = GP && GP.lireTable;
    if (!lire) { return Promise.reject(new Error("Adresse du document Grist non reconnue.")); }
    return Promise.all([
      GP.lireConfig("Portail_Onglets", "Config_portail").catch(function () { return {}; }),
      GP.lireTable("Portail_Onglets")
    ]).then(function (res) {
      var c = res[0] || {};
      var lignes = res[1].filter(function (l) { return l.Actif !== false; }).sort(function (a, b) { return (a.Ordre || 0) - (b.Ordre || 0) || a.id - b.id; });
      c.onglets = lignes.map(function (l) {
        var o = { titre: l.Titre, outil: l.Outil, lien: l.Lien, table: l.Table, adresse: l.Adresse };
        if (l.Options) { try { o.options = JSON.parse(l.Options); } catch (e) { /* réglage ignoré */ } }
        if (l.Mappings) { try { o.mappings = JSON.parse(l.Mappings); } catch (e) { /* réglage ignoré */ } }
        return o;
      });
      return c;
    });
  }

  function lireConfiguration() {
    if (P.get("c")) {
      var c = GP.decoder(P.get("c"));
      return c ? Promise.resolve(c) : Promise.reject(new Error("Configuration de l'adresse illisible."));
    }
    if (P.get("config")) {
      var u = adresseWeb(P.get("config"));
      if (!u) { return Promise.reject(new Error("Adresse du fichier de configuration non valide.")); }
      return fetch(u.href).then(json);
    }
    if (P.get("doc")) { return depuisDocument(); }
    return fetch("config.json").then(json).catch(function () { return {}; });
  }

  // ---- Construction des pages ----

  function adressePage(o, integre) {
    if (o.adresse) {
      var u = adresseWeb(o.adresse);
      if (!u) { return null; }
      if (integre) { u.searchParams.set("integre", "1"); } else { u.searchParams.delete("integre"); }
      return u.href;
    }
    var outil = OUTILS[o.outil];
    if (!outil || !GP.analyserLien(o.lien)) { return null; }
    var base = adresseWeb((cfg.outils || {})[o.outil] || outil.page);
    if (!base) { return null; }
    return GP.lien(base.href, { doc: o.lien, table: o.table, options: o.options, mappings: o.mappings, integre: integre });
  }

  function construire() {
    var liste = [];
    var vus = {};
    function ajouter(e) {
      var s = slug(e.titre), n = 2;
      while (vus[s]) { s = slug(e.titre) + "-" + n++; }
      vus[s] = true; e.id = s;
      liste.push(e);
    }
    if (cfg.accueil && (cfg.accueil.titre || cfg.accueil.texte)) {
      ajouter({ titre: cfg.accueil.titre || "Accueil", accueil: cfg.accueil });
    }
    (cfg.onglets || []).forEach(function (o, i) {
      if (!o || o.actif === false) { return; }
      var titre = o.titre || (OUTILS[o.outil] && OUTILS[o.outil].libelle) || ("Page " + (i + 1));
      ajouter({ titre: titre, src: adressePage(o, true), seul: adressePage(o, false), brut: o });
    });
    return liste;
  }

  function menu(actif) {
    var zone = document.getElementById("po-menu");
    if (entrees.length < 2) { zone.innerHTML = ""; return; }
    zone.innerHTML = "<nav class=\"po-menu\" role=\"navigation\" aria-label=\"Pages du portail\"><div class=\"fr-container\"><ul>" +
      entrees.map(function (e) {
        return "<li><a class=\"po-lien\" href=\"#/" + esc(e.id) + "\"" + (e.id === actif.id ? " aria-current=\"page\"" : "") + ">" + esc(e.titre) + "</a></li>";
      }).join("") + "</ul></div></nav>";
  }

  function hauteur(cadre) {
    var h = window.innerHeight - cadre.getBoundingClientRect().top - 8;
    cadre.style.height = Math.max(600, h) + "px";
  }

  function afficher() {
    var id = location.hash.replace(/^#\/?/, "");
    var e = entrees.filter(function (x) { return x.id === id; })[0] || entrees[0];
    var zone = document.getElementById("po-contenu");
    menu(e);
    document.title = e.titre + (cfg.page && cfg.page.titre ? " - " + cfg.page.titre : "");
    if (e.accueil) {
      var paragraphes = String(e.accueil.texte || "").split(/\n\s*\n/).filter(Boolean).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
      zone.innerHTML = "<div class=\"fr-container po-accueil\"><h1>" + esc(e.accueil.titre || e.titre) + "</h1>" + paragraphes + "</div>";
      return;
    }
    if (!e.src) {
      zone.innerHTML = "<div class=\"fr-container fr-my-4w\"><div class=\"fr-alert fr-alert--warning\"><h1 class=\"fr-alert__title\">" + esc(e.titre) + "</h1><p>Cette page n'est pas configurée correctement : lien du document Grist ou adresse de page publique manquant ou non valide.</p></div></div>";
      return;
    }
    zone.innerHTML = "<div class=\"fr-container\"><div class=\"po-outils\"><a class=\"fr-link fr-icon-external-link-line fr-link--icon-right\" target=\"_blank\" rel=\"noopener\" href=\"" + esc(e.seul) + "\" title=\"Ouvrir « " + esc(e.titre) + " » seule - nouvelle fenêtre\">Ouvrir cette page seule</a></div></div>" +
      "<iframe class=\"po-cadre\" title=\"" + esc(e.titre) + "\" src=\"" + esc(e.src) + "\" sandbox=\"allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads\"></iframe>";
    hauteur(zone.querySelector("iframe"));
  }

  function demarrer(c) {
    cfg = c && typeof c === "object" ? c : {};
    cfg.page = cfg.page || {};
    var page = Object.assign({ marque: "République\nfrançaise", titre: "Portail", pied: { accessibilite: "" } }, cfg.page);
    page.pied = Object.assign({ accessibilite: "" }, cfg.page.pied || {});
    var r = window.PageDSFR.appliquer(page, { entete: document.getElementById("entete"), pied: document.getElementById("pied"), accueil: "#/" });
    if (r.entete) { r.entete.id = "entete"; }
    if (r.pied) { r.pied.id = "pied"; }
    entrees = construire();
    if (!entrees.length) {
      document.getElementById("po-contenu").innerHTML = "<div class=\"fr-container fr-my-4w\"><div class=\"fr-callout\"><h1 class=\"fr-callout__title\">Portail non configuré</h1><p class=\"fr-callout__text\">Aucune page à afficher. Construisez la configuration avec <a href=\"configurer.html\">le générateur</a>.</p></div></div>";
      return;
    }
    window.addEventListener("hashchange", afficher);
    window.addEventListener("resize", function () { var f = document.querySelector(".po-cadre"); if (f) { hauteur(f); } });
    afficher();
  }

  lireConfiguration().then(demarrer).catch(function (e) {
    window.PageDSFR.appliquer({ marque: "République\nfrançaise", titre: "Portail", pied: { accessibilite: "" } }, { entete: document.getElementById("entete"), pied: document.getElementById("pied") });
    erreur((e && e.message) || e);
  });
})();
