# UrbanFlow Mobility — Structure projet Next.js 16

```
urbanflow/
├── prisma/
│   ├── schema.prisma          # Schéma principal (Prisma 6)
│   ├── migrations/            # Migrations auto-générées
│   └── seed.ts                # Données de test
│
├── src/
│   ├── app/                   # App Router Next.js 16
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing / planificateur public
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/             # Pages protégées
│   │   │   ├── layout.tsx     # Layout avec auth check
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── trips/page.tsx
│   │   │   └── carbon/page.tsx
│   │   └── api/               # Controllers HTTP (Route Handlers, max 15 lignes)
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── users/
│   │       │   └── profile/route.ts
│   │       ├── trips/route.ts
│   │       ├── transport/route.ts
│   │       └── carbon/route.ts
│   │
│   ├── backend/               # Toute la logique métier
│   │   ├── users/
│   │   │   ├── create-user/
│   │   │   │   ├── create-user.dto.ts        # DtoIn + DtoOut (Zod)
│   │   │   │   └── create-user.use-case.ts   # Logique + Prisma
│   │   │   ├── get-user-profile/
│   │   │   │   ├── get-user-profile.dto.ts
│   │   │   │   └── get-user-profile.use-case.ts
│   │   │   ├── update-mobility-profile/
│   │   │   │   ├── update-mobility-profile.dto.ts
│   │   │   │   └── update-mobility-profile.use-case.ts
│   │   │   └── index.ts                      # Exports publics du domaine
│   │   │
│   │   ├── trips/
│   │   │   ├── plan-trip/
│   │   │   │   ├── plan-trip.dto.ts
│   │   │   │   └── plan-trip.use-case.ts
│   │   │   ├── score-routes/
│   │   │   │   ├── score-routes.dto.ts
│   │   │   │   └── score-routes.use-case.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── transport/
│   │   │   ├── fetch-gbfs/
│   │   │   │   ├── fetch-gbfs.dto.ts
│   │   │   │   └── fetch-gbfs.use-case.ts
│   │   │   ├── fetch-gtfs/
│   │   │   │   ├── fetch-gtfs.dto.ts
│   │   │   │   └── fetch-gtfs.use-case.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── carbon/
│   │   │   ├── calculate-carbon/
│   │   │   │   ├── calculate-carbon.dto.ts
│   │   │   │   └── calculate-carbon.use-case.ts
│   │   │   └── index.ts
│   │   │
│   │   └── lib/
│   │       ├── prisma.ts      # Singleton PrismaClient
│   │       ├── auth.ts        # Config Auth.js v5
│   │       └── constants.ts   # Facteurs ADEME, config geo
│   │
│   ├── components/            # UI frontend
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Dialog.tsx
│   │   ├── map/
│   │   │   ├── MapView.tsx
│   │   │   └── RouteLayer.tsx
│   │   ├── planner/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── RouteCard.tsx
│   │   │   └── ModeSelector.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── SettingsPanel.tsx
│   │
│   ├── hooks/
│   │   ├── useGeolocation.ts
│   │   ├── useTrip.ts
│   │   └── useCarbon.ts
│   │
│   └── services/              # Fetch typés frontend → api/
│       ├── users.service.ts
│       ├── trips.service.ts
│       └── carbon.service.ts
│
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│
├── tests/
│   ├── unit/                  # Vitest
│   └── e2e/                   # Playwright
│       └── planner.spec.ts
│
├── docker-compose.yml
├── .env
├── .env.local
├── .env.example
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

## Règles d'architecture

- **1 use-case = 1 dossier** avec son DTO — colocalisés, jamais séparés
- **DTO** : Zod DtoIn (validation entrée) + DtoOut (contrat de sortie)
- **Use-case** : fonction async, accède directement à Prisma — pas de repository intermédiaire
- **Route Handler** = controller : valide la session, appelle le use-case, retourne le DtoOut
- **PrismaClient = singleton** dans `backend/lib/prisma.ts`, jamais instancié ailleurs
- **Zéro import croisé** entre domaines — chaque domaine expose son `index.ts`
- **`services/`** = seuls fichiers frontend autorisés à appeler `fetch` vers `api/`

## Points de vigilance

| Risque | Mitigation |
|--------|-----------|
| Prisma 7 TS2742 | Verrouiller `prisma@6` + `@prisma/client@6` |
| MapLibre SSR | Import dynamique `next/dynamic` + `ssr: false` |
| Auth.js v5 edge runtime | Middleware sur `/app` seulement |
| GBFS/GTFS latence | Revalidation ISR 60s sur route |
| PostGIS Docker | Image `postgis/postgis:16-3.4` obligatoire |
| PWA + Next.js 16 | Serwist config dans `next.config.ts` |
