# Caisse-Vesuvio# 🍕 Caisse Le Vesuvio

Application web mobile de gestion des encaissements journaliers pour la pizzeria Le Vesuvio.
Développée pour un usage quotidien sur smartphone, sans dépendance à un logiciel tiers.

---

## 📋 Fonctionnement général

La journée est découpée en **2 services** :

- ☀️ **Midi** : saisie rapide des montants indiqués par le logiciel de caisse (Adipos)
- 🏁 **Soir** : comptage réel complet de la caisse, télécollecte TPE incluse

Les données sont archivées dans **Google Sheets** via Google Apps Script.

---

## 🗂️ Structure des fichiers
```
├── index.html          → Structure de l'application
├── style.css           → Design et thèmes (jaune Midi / bleu Soir)
├── app.js              → Logique principale (state, saisie, récap, envoi)
├── fond-caisse.js      → Module de réassort du fond de caisse (134€)
```

**Google Apps Script (côté serveur) :**
```
├── Code.gs                  → Réception des données (doGet), écriture COMPTA_JOURNALIERE
├── InjectionMensuelle.gs    → Injection dans la feuille comptable mensuelle
```

---

## 📱 Vues de l'application

### Service Midi (thème jaune)
Saisie des montants du logiciel Adipos :
- CB Classique, CB Ticket Resto, MyPos
- Espèces, ANCV Papier, ANCV Connect, Chèques
- Nombre de pizzas (emportées / sur place)
- TVA 5,5% / 10% / 20%

### Service Soir (thème bleu)
Comptage réel en 5 écrans :

| Écran | Contenu |
|---|---|
| 💳 CB | CB Classique (contact/sans contact), CB TR, MyPos, CB AMEX |
| 💰 Espèces | Grille de comptage par coupure, fond de caisse 134€ |
| ✍️ Chèques | Saisie individuelle des chèques |
| 🏖️ ANCV | ANCV Papier (10€/25€/50€) et ANCV Connect (montant libre) |
| 🖥️ Z | Données logiciel Adipos : espèces Z, pizzas, TVA |

---

## 💾 Archivage des données

### Feuille `COMPTA_JOURNALIERE`
2 lignes par jour (une par service) avec les colonnes :

| Colonne | Donnée |
|---|---|
| col_Date | Date du jour |
| col_Annee | Année |
| col_Mois | Mois en toutes lettres |
| col_JourSem | Jour de la semaine |
| col_JourNum | Numéro du jour |
| col_Service | Midi / Soir / Fermé (Midi) / Fermé (Soir) |
| col_CB | CB Classique + AMEX |
| col_TR | CB Ticket Restaurant |
| col_ANCV_P | ANCV Papier |
| col_ANCV_C | ANCV Connect |
| col_Chq | Chèques |
| col_MyPos | MyPos (hors Z) |
| col_Cash_Net | Espèces comptées - fond de caisse (Soir uniquement) |
| col_Cash_Adipos | Espèces logiciel Z |
| col_Delta | Écart espèces réel vs logiciel |
| col_TVA5 | TTC 5,5% |
| col_TVA10 | TTC 10% |
| col_TVA20 | TTC 20% |
| col_Piz_E | Pizzas emportées |
| col_Piz_P | Pizzas sur place |
| col_CA_Total | CA total réel |

> ⚠️ Les colonnes sont mappées via des **plages nommées** Google Sheets.
> La ligne Soir contient les valeurs **nettes** (Midi soustrait automatiquement par Apps Script).

### Feuille mensuelle (`mars 2026`, `avril 2026`...)
Injection automatique à la clôture du Soir avec les totaux journaliers bruts :

| Colonne | Donnée |
|---|---|
| C | TVA 5,5% |
| D | TVA 10% |
| E | TVA 20% |
| L | Espèces logiciel |
| M | CB Classique + AMEX |
| N | Chèques |
| O | ANCV Papier |
| P | ANCV Connect |
| Q | CB Ticket Restaurant |

---

## ⚙️ Logique Apps Script

### Archivage Midi
- Écriture directe dans `COMPTA_JOURNALIERE`

### Clôture Soir
1. Détection automatique si le Midi a été archivé
2. Si Midi absent → création automatique d'une ligne `Fermé (Midi)`
3. Soustraction des valeurs Midi sur tous les moyens de paiement et TVA
4. Écriture de la ligne Soir nette dans `COMPTA_JOURNALIERE`
5. Injection des totaux bruts dans la feuille mensuelle

### Jours manquants
Si l'appli n'est pas utilisée plusieurs jours de suite, `fillMissingDays()` crée automatiquement les lignes `Fermé (Midi)` et `Fermé (Soir)` pour chaque jour manquant.

---

## 💰 Fond de caisse

Cible : **134,00€** composé de :

| Coupure | Quantité |
|---|---|
| 20€ | 2 |
| 10€ | 4 |
| 5€ | 4 |
| 2€ | 10 |
| 1€ | 10 |
| 0,50€ | 5 |
| 0,20€ | 5 |
| 0,10€ | 5 |

À la clôture du Soir, le module `FondCaisseModule` calcule automatiquement ce qu'il faut ajouter ou retirer pour revenir à 134€.

---

## 🚀 Déploiement

L'application est hébergée sur **GitHub Pages**.
L'envoi des données se fait via une requête GET vers un **Google Apps Script déployé en web app** (accès anonyme).

> ⚠️ Après toute modification de `Code.gs` ou `InjectionMensuelle.gs`, un **nouveau déploiement** Apps Script est obligatoire pour que les changements soient pris en compte.
