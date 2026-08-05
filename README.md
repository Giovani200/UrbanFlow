# UrbanFlow

**L'empreinte au cœur du choix.**

Plateforme de mobilité urbaine multimodale pour l'aire grenobloise. UrbanFlow compare chaque itinéraire en temps et en empreinte carbone, et classe les options selon les priorités de l'utilisateur. Application web progressive (PWA) ; les fonctions cœur sont accessibles sans compte.

## Fonctionnalités

- Planification d'itinéraires multimodaux (marche, vélo, accessible fauteuil, transports en commun) avec géolocalisation temps réel.
- Comparaison des trajets par empreinte carbone (facteurs ADEME), pondérable selon les priorités.
- Données temps réel : trottinettes en libre-service (Voi) et arrêts du réseau grenoblois (Métromobilité).
- Comptes et profil mobilité (e-mail / mot de passe ou Google) pour les fonctions personnalisées.

## Stack

| Domaine | Choix |
|---|---|
| Monorepo | npm workspaces (`packages/*`, `apps/*`) |
| Front | Next.js 16 · React 19 · Tailwind CSS 4 · Radix UI |
| Back | NestJS 11 |
| Types partagés | Zod 4 |
| Base de données | PostgreSQL 16 + PostGIS 3.4 · Prisma 6 |
| Auth | Passport-JWT + Google OAuth |
| Cartographie | MapLibre GL JS + MapTiler |
| PWA | Serwist |
| Tests | Vitest |

## Architecture

Monorepo npm workspaces.

```
packages/app-front-back-lib/   Contrat de types partagé (Zod)
apps/api/                      API NestJS — Prisma, PostgreSQL / PostGIS
apps/web/                      Front Next.js — App Router, PWA
```

## Démarrage

### Prérequis

- Node.js 20+
- Docker + Docker Compose

### Installation

```bash
git clone <url-du-repo>
cd urbanflow
npm install
```

### Configuration

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Renseigner les valeurs. Comptes externes requis : OpenRouteService (`ORS_API_KEY`), Google OAuth (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`), MapTiler (`NEXT_PUBLIC_MAPTILER_KEY`).

### Base de données

```bash
cd apps/api
docker compose up -d      # PostgreSQL + PostGIS sur localhost:5433
npm run prisma:migrate    # applique le schéma
```

### Lancement

```bash
# API — http://localhost:3001
cd apps/api && npm run start:dev

# Front — http://localhost:3000  (depuis la racine)
npm run dev:web
```

## Scripts

| Commande | Emplacement | Effet |
|---|---|---|
| `npm run dev:web` | racine | Front en développement |
| `npm run start:dev` | `apps/api` | API en développement (watch) |
| `npm run build` | `apps/api` · `apps/web` | Build de production |
| `npm run test` | `apps/api` · `apps/web` | Tests Vitest |
| `npm run prisma:migrate` | `apps/api` | Migration Prisma |
| `npm run prisma:studio` | `apps/api` | Prisma Studio |

## Tests

```bash
npm run test --workspace @urbanflow/api
npm run test --workspace @urbanflow/web
```