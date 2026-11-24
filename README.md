# grist-portail

Portail en interface DSFR : une page à menu qui rassemble les pages publiques des outils Grist (carte, graphe, consultation, réunions, management visuel, suivi de projets). Le portail ne lit rien lui-même : il affiche chaque page publique dans un cadre, avec le nom, le logo et le pied de page de la communauté.

Adresse stable : `https://lab17bis.github.io/grist-portail/v1/`

## Ce que permet le portail

- Un nom, un sous-titre, un logo, un bloc-marque facultatif et un pied de page.
- Une page d'accueil facultative (titre et paragraphes).
- Autant de pages que voulu, dans l'ordre voulu. Chaque page affiche la page publique d'un outil, intégrée sans son propre en-tête.
- Un lien « Ouvrir cette page seule » sur chaque page, pour l'ouvrir en plein écran.
- Un menu uniquement s'il y a plusieurs pages.

## Configurer

Le plus simple : ouvrir `configurer.html`. Le générateur produit un lien de portail prêt à partager et la configuration au format JSON. Il sait aussi reprendre une configuration existante.

La configuration est lue, dans cet ordre, depuis :

| Source | Adresse | Usage |
|---|---|---|
| Lien | `index.html?c=<configuration encodée>` | Rien à héberger. Le lien porte toute la configuration. |
| Fichier distant | `index.html?config=<adresse d'un .json>` | Fichier hébergé ailleurs, accessible depuis un autre site. |
| Document Grist | `index.html?doc=<lien du document Grist public>` | La communauté modifie ses pages dans Grist. |
| Fichier voisin | `config.json` à côté de `index.html` | Copie du portail hébergée par la communauté. |

### Format de la configuration

```json
{
  "page": {
    "marque": "République\nfrançaise",
    "titre": "Nom du portail",
    "sousTitre": "Une phrase",
    "logo": { "src": "https://…", "alt": "Texte alternatif", "hauteur": 3 },
    "pied": { "texte": "", "liens": [{ "libelle": "Contact", "lien": "mailto:…" }], "mention": "", "accessibilite": "" }
  },
  "accueil": { "titre": "Bienvenue", "texte": "Premier paragraphe.\n\nSecond paragraphe." },
  "outils": { "carte": "adresse de la page publique de la carte, si elle est hébergée ailleurs" },
  "onglets": [
    { "titre": "Carte", "outil": "carte", "lien": "https://…/doc/IDENTIFIANT", "table": "Lieux" },
    { "titre": "Autre", "adresse": "https://…?public=1&doc=…" }
  ]
}
```

Une page se désigne de deux façons :

- **Outil et document** : `outil` (`carte`, `graphe`, `consultation`, `reunion`, `management`, `projets`), `lien` (document Grist partagé en lecture publique) et, pour la carte et le graphe, `table`. Les champs facultatifs `options` et `mappings` reprennent les réglages d'affichage de l'outil.
- **Adresse** : le lien de la page publique copié depuis l'onglet Publication de l'outil. Il conserve donc les réglages faits dans l'outil.

Une page sans `lien` valide ni `adresse` valide affiche un message d'erreur à la place du cadre. Seules les adresses `http` et `https` sont acceptées.

### Configurer dans un document Grist

Créer une table `Portail_Onglets` avec les colonnes :

| Colonne | Type | Contenu |
|---|---|---|
| `Titre` | Texte | Titre de la page |
| `Outil` | Texte ou choix | `carte`, `graphe`, `consultation`, `reunion`, `management`, `projets` |
| `Lien` | Texte | Lien du document Grist public |
| `Table` | Texte | Table à afficher (carte, graphe) |
| `Adresse` | Texte | Lien de page publique (à la place d'`Outil` et `Lien`) |
| `Options`, `Mappings` | Texte | Réglages au format JSON (facultatif) |
| `Ordre` | Numérique | Ordre dans le menu |
| `Actif` | Oui/Non | Décocher pour masquer la page |

Les réglages de la page (`page`, `accueil`, `outils`) se placent au format JSON dans la **description** d'une colonne nommée `Config_portail` de cette table. Le document doit être partagé en lecture publique.

## Ce qui devient public

Le portail n'ajoute aucune protection : il affiche ce que chaque page publique affiche. Avant de publier, vérifiez dans chaque document les règles d'accès Grist (colonnes personnelles, adresses de courriel, votes nominatifs).

## Tests

```bash
cd v1 && python3 -m http.server 8784 &
CHROME=/usr/bin/google-chrome python3 tests/test_portail.py
```

Les pages des outils et le document Grist sont simulés.

## Licence

Voir `v1/LICENSE`. Le DSFR (`v1/vendor/dsfr`) est distribué sous sa propre licence.
