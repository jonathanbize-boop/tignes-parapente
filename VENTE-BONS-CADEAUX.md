# Vente en ligne de bons cadeaux — guide de mise en service

Ce module ajoute la **vente de bons cadeaux** au site : paiement par carte (Stripe),
génération automatique d'un **bon PDF avec QR code unique et infalsifiable**, envoi par
**email**, et **page de vérification** pour le moniteur (anti-réutilisation).

> ⚠️ Ces fonctionnalités nécessitent un hébergement avec **fonctions serveur** : le site
> doit être déployé sur **Vercel** (gratuit). Sur GitHub Pages, le formulaire s'affiche mais
> le paiement ne fonctionne pas (pas de serveur).

## Comment ça marche

1. L'acheteur remplit le formulaire sur **bon-cadeau.html** (vol, **nom du bénéficiaire**, message, email).
2. Il paie via **Stripe Checkout** (page de paiement sécurisée hébergée par Stripe).
3. Stripe prévient le site (**webhook**). Le serveur :
   - génère un **code unique** signé (HMAC → infalsifiable),
   - crée le **PDF du bon** avec **QR code**,
   - enregistre le bon en **base de données** (statut « valide »),
   - **envoie le bon par email** à l'acheteur (+ copie à l'entreprise).
4. Le jour du vol, le moniteur **scanne le QR code** → page `verifier.html` :
   - affiche si le bon est **valide / déjà utilisé / non authentique**,
   - bouton **« Marquer comme utilisé »** (protégé par un code admin) pour empêcher toute réutilisation.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `api/create-checkout-session.js` | Crée la session de paiement Stripe |
| `api/stripe-webhook.js` | Reçoit la confirmation de paiement → génère le bon, le PDF, l'email |
| `api/voucher.js` | Vérifie un bon (lecture seule) — utilisé par la page de scan |
| `api/redeem.js` | Marque un bon « utilisé » (réservé admin) |
| `api/session.js` | Infos pour la page de remerciement |
| `api/_lib/*` | Modules partagés (prix, base de données, codes signés, PDF, email) |
| `bon-cadeau.html` | Formulaire d'achat (section « Commander en ligne ») |
| `merci.html` | Page de confirmation après paiement |
| `verifier.html` | Page de vérification / validation des bons (espace moniteur) |

## Mise en service (une seule fois)

### 1. Déployer sur Vercel
- Créez un compte sur [vercel.com](https://vercel.com) (gratuit).
- « Add New… → Project » → importez le dépôt GitHub `tignes-parapente`.
- Vercel détecte tout seul le site + les fonctions `/api`. Cliquez **Deploy**.
- (Le site sera sur une URL `…vercel.app` ; on y branchera ensuite votre domaine `www.tignes-parapente.com`.)

### 2. Base de données (suivi des bons)
- Dans le projet Vercel → onglet **Storage** → **Create Database → Postgres**.
- Vercel ajoute automatiquement la variable `POSTGRES_URL`. (La table se crée toute seule au premier achat.)

### 3. Emails (Resend)
- Créez un compte sur [resend.com](https://resend.com) (gratuit pour démarrer).
- Vérifiez votre domaine `tignes-parapente.com` (pour envoyer depuis `bons@tignes-parapente.com`).
- Récupérez une **API Key**.

### 4. Stripe
- Compte sur [stripe.com](https://stripe.com).
- Récupérez la **clé secrète** (`sk_live_…`) dans Développeurs → Clés API.
- Créez un **Webhook** : Développeurs → Webhooks → « Add endpoint » :
  - URL : `https://VOTRE-DOMAINE/api/stripe-webhook`
  - Évènement : `checkout.session.completed`
  - Récupérez le **secret de signature** (`whsec_…`).

### 5. Variables d'environnement (Vercel → Settings → Environment Variables)
Renseignez (voir `.env.example` pour le détail) :

```
STRIPE_SECRET_KEY      = sk_live_...
STRIPE_WEBHOOK_SECRET  = whsec_...
VOUCHER_SECRET         = (chaîne aléatoire longue — ex. openssl rand -base64 32)
ADMIN_TOKEN            = (code secret pour valider les bons sur verifier.html)
RESEND_API_KEY         = re_...
FROM_EMAIL             = Tignes Parapente <bons@tignes-parapente.com>
BUSINESS_EMAIL         = votre-email@exemple.com   (copie des ventes, optionnel)
PUBLIC_BASE_URL        = https://www.tignes-parapente.com
POSTGRES_URL           = (ajouté automatiquement par Vercel Postgres)
```
Puis **redeploy** pour que les variables soient prises en compte.

### 6. Tester
- Mode test Stripe : utilisez les clés `sk_test_…` / `whsec_…` de test et la carte `4242 4242 4242 4242`.
- Achetez un bon → vérifiez la réception de l'email + le PDF + le QR.
- Scannez le QR → `verifier.html` doit afficher « Bon valide » → testez « Marquer comme utilisé ».

## Modifier les prix / vols
Tout est centralisé dans **`api/_lib/flights.js`** (prix faisant autorité, en centimes) et
dans le `<select>` de **bon-cadeau.html**. Le vol « Groupe » se fait sur devis (lien contact).

## Sécurité
- La clé secrète Stripe et les autres secrets ne sont **jamais** dans le code (uniquement en variables Vercel).
- Les bons sont **signés** (HMAC) : impossible d'en fabriquer un faux QR sans `VOUCHER_SECRET`.
- Le webhook vérifie la **signature Stripe** : impossible de simuler un faux paiement.
- La validation « utilisé » exige le **code admin** (`ADMIN_TOKEN`).

> Note : `bon-cadeau.html`, `merci.html` et `verifier.html` sont désormais maintenus à la main
> (ne pas les régénérer via les scripts `_scrape/gen_*.py`, qui ne contiennent pas ce module).
