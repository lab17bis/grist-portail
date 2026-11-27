# grist-portail

Portail en interface DSFR : une page à menu qui rassemble les pages publiques des outils Grist (carte, graphe, consultation, réunions, management visuel, suivi de projets). Le portail ne lit rien lui-même : il affiche chaque page publique dans un cadre, avec le nom, le logo et le pied de page de la communauté.

Adresse stable de la page publique : `https://lab17bis.github.io/grist-portail/v1/`

Adresse du widget (configurateur, à ajouter dans Grist comme vue personnalisée, accès complet) : `https://lab17bis.github.io/grist-portail/v1/widget.html`

## Le configurer dans Grist

Le widget suit l'éditeur commun aux autres outils : nom et statut à gauche, quatre onglets au centre, *Enregistrer* à droite.

| Onglet | Rôle |
|---|---|
| **Réglages** | Page d'accueil facultative, puis les pages du menu : titre, outil et document Grist, ou adresse d'une page publique ; ordre, affichage, retrait. |
| **En-tête et pied** | Bloc-marque, logo, titre, pied de page. |
| **Aperçu** | Le portail complet, avec son en-tête et son pied de page (onglet ouvert par défaut). |
| **Publication** | Le lien de la page publique du portail, à partir du lien du document Grist partagé en lecture publique. |

**Éditeur du widget ou page d'usage, avec le même lien.** Chaque vue Grist choisit ce qu'elle affiche (onglet *Publication*, rubrique *Affichage de cette vue Grist*) : l'**éditeur du widget** (affichage par défaut) ou la **page d'usage** (l'outil avec son en-tête et son pied de page, sans barre de réglages ; un lien *Éditer le widget*, en bas de page, rouvre l'éditeur). Après *Appliquer à cette vue*, cliquez sur *Enregistrer* en haut à droite de la vue Grist pour garder le choix. Pour avoir les deux dans un document, ajoutez deux vues Personnalisées avec la même adresse. Ce choix n'est pas une protection : les droits restent ceux du document (Partager, Permissions avancées).

À la première ouverture, le widget propose de créer la table `Portail_Onglets`. L'enregistrement écrit une ligne par page et les réglages de la page dans la colonne `Config_portail`.

### Exemple : une consultation publique

Deux pages : la page publique de [grist-consultation](https://github.com/lab17bis/grist-consultation) (outil « Consultation » et lien du document), puis la page publique d'un [grist-questionnaire](https://github.com/lab17bis/grist-questionnaire) branché sur la table des votes (« Une adresse de page publique »). Les personnes consultent les propositions, puis votent sans quitter la même adresse.

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

### Sites autorisés

Le portail n'affiche que les pages de son propre site et des sites des outils (par défaut `lab17bis.github.io`). Une page d'un autre site est refusée avec un message. Pour en autoriser un, la personne qui **héberge** le portail l'ajoute dans le fichier `config.json` placé à côté de `index.html` :

```json
{ "hotesAutorises": ["mon-site.exemple.fr"] }
```

Cette liste n'est lue que dans ce fichier. Une configuration passée dans l'adresse (`?c=`, `?config=`, `?doc=`) ne peut pas l'élargir : quelqu'un qui fabrique un lien vers le portail ne peut donc pas y faire apparaître la page d'un site de son choix. La même règle s'applique à la clé `outils`, qui remplace l'adresse d'un outil.

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

Le portail n'ajoute aucune protection aux données : il affiche ce que chaque page publique affiche. Avant de publier, vérifiez dans chaque document les règles d'accès Grist (colonnes personnelles, adresses de courriel, votes nominatifs).

## Tests

```bash
(cd v1 && python3 -m http.server 8784 &)
CHROME=/usr/bin/google-chrome python3 tests/test_portail.py
```

Les pages des outils et le document Grist sont simulés.

## Licence

Voir `v1/LICENSE`. Le DSFR (`v1/vendor/dsfr`) est distribué sous sa propre licence.

Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims.
