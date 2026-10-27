PROJET FVA — FORMULAIRE DE PRÉINSCRIPTION CLOUDFLARE

IMPORTANT : cette archive contient les fichiers du site et le code du traitement serveur. Elle ne contient PAS encore de base D1 créée sur ton compte. Le déploiement n'est donc pas un simple téléversement d'image.

CONTENU
- public/ : formulaire visible (HTML, CSS, JavaScript)
- src/index.js : traitement serveur qui valide et enregistre les données
- migrations/0001_create_preinscriptions.sql : structure SQL de la base
- wrangler.toml : configuration Cloudflare à compléter

AVANT LE DÉPLOIEMENT
1. Créer une base D1 nommée fva-preinscriptions dans Cloudflare.
2. Récupérer son identifiant (database ID) et remplacer REMPlACER_PAR_ID_D1 dans wrangler.toml.
3. Appliquer la migration SQL à la base D1.
4. Déployer le projet comme Cloudflare Worker avec assets statiques et binding D1 DB. Le flux « Pages > téléversement de fichiers statiques » seul ne configure pas le backend ni la base.
5. Tester une préinscription réelle, puis vérifier sa présence dans D1.

Cette version est une base de reconstruction : elle reprend un formulaire FVA bleu avec les parcours Particulier/Entreprise et des champs conditionnels, mais elle ne peut pas garantir une reproduction pixel par pixel de l'ancien formulaire puisqu'aucune copie ni capture de l'ancien formulaire n'a été fournie.

SÉCURITÉ
- Ne jamais publier de secrets ni de clés d'accès dans public/.
- Prévoir une authentification administrateur avant de créer une page permettant de consulter les dossiers.
- Les données personnelles doivent être accessibles uniquement aux personnes autorisées.
