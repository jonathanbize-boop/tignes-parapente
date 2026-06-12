# Tignes Parapente — Nouveau site internet

Site multipage statique (HTML/CSS/JS pur) : rapide, sécurisé, hébergeable partout
(OVH, o2switch, Netlify, Vercel, GitHub Pages…). Aucune dépendance, aucun abonnement.

## Les pages

| Fichier | Page |
|---|---|
| `index.html` | Accueil (héro vidéo, vols, étapes, galerie, bon cadeau, Instagram, FAQ) |
| `vol-decouverte.html` | Vol Découverte — 100 € |
| `vol-sensation.html` | Vol Sensation — 110 € |
| `vol-enfant.html` | Vol Spécial Enfant — 95 € (6-10 ans) |
| `vol-groupe.html` | Vol Groupe — 100 €/pers (dès 5 pers, photos offertes) |
| `bon-cadeau.html` | Bon cadeau |
| `videos.html` | Vidéos + lien Instagram |
| `faq.html` | FAQ complète (avec balisage Google FAQ) |
| `contact.html` | Contact, formulaire de réservation, carte d'accès |
| `mentions-legales.html` | Mentions légales et confidentialité |

## SEO — ce qui est déjà fait

- Titres et meta descriptions uniques et optimisés sur chaque page
- Données structurées Schema.org : LocalBusiness + offres (accueil),
  Product + prix (pages vols), FAQPage (FAQ), fils d'Ariane
- `sitemap.xml` et `robots.txt` prêts (à soumettre dans Google Search Console)
- Open Graph / Twitter Cards (beaux aperçus quand on partage le site)
- Images converties en WebP avec noms de fichiers et textes alternatifs descriptifs
- HTML sémantique, lazy-loading, site très léger : excellent score Core Web Vitals

## À personnaliser avant la mise en ligne

1. **E-mail du formulaire** : dans `contact.html`, remplacez
   `data-mailto="contact@tignes-parapente.com"` par votre vraie adresse.
   (Le formulaire ouvre la messagerie du visiteur avec la demande pré-remplie.
   Pour une réception directe sans ouverture de messagerie, un service gratuit
   type formsubmit.co ou Formspree peut être branché en 5 minutes.)
2. **Photos Instagram** : la section Instagram pointe vers votre profil ;
   remplacez les 4 vignettes par vos derniers posts quand vous le souhaitez
   (`index.html`, section `@tignes_parapente`).
3. **Vidéos** : ajoutez vos nouveaux clips dans `video/` et dupliquez le bloc
   vidéo de `videos.html`. Les reels Instagram peuvent aussi être intégrés via
   « Intégrer » sur Instagram.

## Dossiers

- `img/` — images optimisées WebP (utilisées par le site)
- `video/` — vidéo du site
- `css/`, `js/` — styles et interactions
- `assets/`, `_scrape/` — fichiers sources et de travail (à NE PAS mettre en ligne,
  ils sont exclus par robots.txt mais autant ne pas les téléverser)

## Aperçu en local

Double-cliquez sur `index.html`, ou pour un vrai serveur local :
`python -m http.server 8731` puis http://localhost:8731
