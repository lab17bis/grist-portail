# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

## 2026-11-27 (accès au document)
- Barre de l'éditeur : le nom du widget et son statut restent sur une ligne ; la barre ne change plus de hauteur quand le statut passe à « non enregistré ».
- Dans Grist, quand le widget ne peut pas lire le document (accès complet non accordé, ou compte sans droit de lecture), un message le dit et indique quoi faire, au lieu d'un outil vide ou d'un écran d'installation. Contrôle commun, dans `commun/barre.js`.

## 2026-11-27 (barre commune de l'éditeur)
- Barre commune à tous les widgets (fichier partagé `commun/barre.js` et `commun/barre.css`) : nom du widget et statut à gauche, onglets Réglages, En-tête et pied, Aperçu, Publication au centre, Enregistrer à droite ; barre collante en haut de l'écran.
- L'outil n'a plus d'onglet à son nom : il s'utilise dans l'Aperçu, ouvert par défaut, avec l'en-tête et le pied de page (affichés une seule fois). Les rubriques propres à l'outil sont des sous-onglets de Réglages quand il y en a plusieurs.
- Liens et boutons « Réglages » ou « Configurer » de l'outil masqués : la barre suffit.
- Même lien, deux affichages : chaque vue Grist choisit, dans Publication, l'éditeur du widget ou la page d'usage (l'outil avec son en-tête et son pied, sans barre, avec un lien « Éditer le widget »). Le choix est une option de la vue Grist ; par défaut, l'éditeur s'affiche comme avant.
- Affichage de la vue : après « Appliquer à cette vue », un texte rappelle de cliquer sur Enregistrer en haut de la vue Grist pour garder le choix (vérifié dans Grist).

## 2026-11-27 (remise à niveau)
- Fichiers communs de la barre de réglages remis au niveau des autres outils : bouton Enregistrer aligné et place réservée, pastille Enregistré visible partout, onglets centrés, lien réservé aux personnes invitées dans Publication, adresse à identifiant long refusée.
- Dépôt rangé comme les autres : le code de travail est à la racine, `v1/` est la copie figée par `outils/figer-version.sh 1`. Les adresses `/v1/` ne changent pas ; la racine ouvre désormais le portail au lieu de rediriger.

## 2026-11-26 (style commun de configuration)

### Corrigé
- Configuration : sur l'onglet de l'outil, le style commun masquait par erreur tout champ dont l'identifiant finit par « -etat » (dans grist-projet : le filtre « État » de la banque et la liste « État » du formulaire de projet). Seul le badge « Enregistré » de la barre est maintenant masqué. Rien à refaire : rechargez la page.

## 2026-11-26 (configurateur dans Grist)

### Ajouté
- Widget `widget.html` : configurateur du portail dans Grist, avec la page de configuration commune (Portail, Pages, En-tête et pied, Aperçu, Publication). Création de la table `Portail_Onglets` à la première ouverture ; pages ajoutées, ordonnées, retirées ; lien de publication construit.
- Paramètre `integre=1` sur la page du portail : retire l'en-tête et le pied de page (utilisé par la vue du widget).

### Inchangé
- La page publique `index.html`, ses adresses et ses sources de configuration (`?c=`, `?config=`, `?doc=`, `config.json`).

## 2026-11-25 (mention de conception)

### Ajouté
- Mention discrète en pied de page, sur l'outil comme sur ses pages publiques : « Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims ».

## 2026-11-25 (sites autorisés)

### Sécurité
- Le portail n'affiche plus que les pages de son propre site et des sites des outils. Un autre site doit être ajouté par la personne qui héberge le portail, dans `config.json` (clé `hotesAutorises`). Une adresse fabriquée (`?c=`, `?config=`, `?doc=`) ne peut ni intégrer la page d'un site quelconque, ni détourner l'adresse d'un outil.

## 2026-11-25 (audit de sécurité)

### Sécurité
- Les liens venant des données ou des réglages sont vérifiés par le navigateur lui-même : une adresse déguisée (« java⇥script: » avec tabulation, retour à la ligne ou caractère de contrôle) n'est plus acceptée. Elle permettait, sur le portail, d'exécuter du script au clic depuis une adresse fabriquée.
- Politique de sécurité de contenu stricte : seuls les scripts du site, l'API Grist et les scripts de la page connus par leur empreinte peuvent s'exécuter. L'évaluation de texte (« unsafe-eval ») reste permise : l'API officielle de Grist en a besoin (sans elle, les widgets restaient bloqués sur « Chargement… » dans Grist le 25/11 au matin). Un script injecté (lien javascript:, attribut onerror…) est bloqué même si un filtre le laissait passer.
- Page publique : message clair si le document Grist est injoignable (au lieu de « Failed to fetch »).

## 2026-11-24 (durcissement)

### Sécurité
- Les pages ajoutent une politique de sécurité de contenu minimale (pas d'objets embarqués, pas de balise base).
- Les pages publiques n'acceptent plus qu'un lien de document Grist en https (http seulement pour localhost, en développement).

## 2026-11-24 (message de lecture publique)

### Corrigé
- Page publique : quand une table est masquée par les règles d'accès du document, le message nomme la table et explique la cause (erreur 403), au lieu de demander si le document est partagé. Comportement vérifié sur un vrai document Grist : une table refusée au public répond 403, une colonne refusée disparaît des lignes, les personnes connectées gardent leurs droits.

## 2026-11-24

### Ajouté
- Première version du portail : page DSFR à menu qui intègre les pages publiques de la carte, du graphe, de la consultation, des réunions, du management visuel et du suivi de projets.
- Nom, sous-titre, logo, bloc-marque, pied de page et page d'accueil réglables.
- Configuration par lien (`?c=`), par fichier (`?config=` ou `config.json`) ou par document Grist (`?doc=`, table `Portail_Onglets`).
- Générateur `configurer.html` : formulaire, lien prêt à partager, configuration JSON, reprise d'une configuration existante.
- Chaque page peut s'ouvrir seule par un lien « Ouvrir cette page seule ».
- Une table masquée par les règles d'accès du document de configuration n'empêche plus de lire les autres.
