# Site institutionnel SAONA

Site statique (HTML, CSS, un peu de JavaScript, sans dépendance) construit à partir du **Brandbook SAONA (novembre 2026)**.

```bash
cd site && python3 -m http.server 8000   # puis http://localhost:8000
```

## Pages

| Page | Contenu (source : brandbook) |
|---|---|
| `index.html` | Signature, mission, vision, 3 leviers + brique récompense, méthode, valeurs |
| `approche.html` | Univers, vision / mission / ambition, signature, valeurs, promesse |
| `solutions.html` | Parrainage, Ambassadeurs (Mon programme Ambassadeur), Fidélisation & Incentive, Cadeaux Privés by Saona, architecture de marque, Aurizon |
| `contact.html` | Formulaire + adresse |
| `mentions-legales.html` | Trame à compléter |

## Règles de charte appliquées

- Bleu nuit `#0E2142` et violet `#7D76B7` comme repères permanents (p. 15).
- Couleurs leviers en accent uniquement : cobalt `#4562AE`, aqua `#27BDBE`, violet (p. 16).
- Framboise `#E50749` réservée à Cadeaux Privés / Rewards (p. 13, 16).
- Dégradé bleu nuit / violet réservé aux couvertures ; dégradés leviers = bleu nuit + couleur du levier (p. 19-20).
- Titres en Plus Jakarta Sans ExtraBold, interlettrage resserré (p. 17-18).

## À compléter avant la mise en ligne

1. **Logos** : extraits en vectoriel du PDF du brandbook (`assets/logo/`). À remplacer par les fichiers officiels de l'agence (le brandbook l'exige, p. 14).
2. **Police Aptos** (texte courant) : non disponible sur Google Fonts. Le site utilise Aptos si elle est installée chez le visiteur, sinon Segoe UI / Roboto / Arial. Pour un rendu fidèle, héberger des fichiers web d'Aptos sous licence.
3. **Photos** (`assets/img/`) : issues du brandbook, en basse définition pour certaines. Vérifier les droits d'usage web et récupérer les originaux.
4. **Formulaire de contact** : renseigner l'adresse dans `data-destinataire` (`contact.html`) ou brancher un service de formulaire.
5. **Mentions légales** : champs `[à compléter]` (obligations LCEN art. 6 et RGPD).
6. **Contenus absents du brandbook** : références clients, chiffres, cas d'usage détaillés par levier, e-mail et téléphone de contact.
