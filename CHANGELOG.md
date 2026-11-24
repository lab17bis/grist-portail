# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

## 2026-11-24

### Ajouté
- Première version du portail : page DSFR à menu qui intègre les pages publiques de la carte, du graphe, de la consultation, des réunions, du management visuel et du suivi de projets.
- Nom, sous-titre, logo, bloc-marque, pied de page et page d'accueil réglables.
- Configuration par lien (`?c=`), par fichier (`?config=` ou `config.json`) ou par document Grist (`?doc=`, table `Portail_Onglets`).
- Générateur `configurer.html` : formulaire, lien prêt à partager, configuration JSON, reprise d'une configuration existante.
- Chaque page peut s'ouvrir seule par un lien « Ouvrir cette page seule ».
- Une table masquée par les règles d'accès du document de configuration n'empêche plus de lire les autres.
