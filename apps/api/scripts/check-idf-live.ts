/**
 * Vérification manuelle sur le vrai réseau PRIM, hors CI : elle consomme du quota (environ 15 appels).
 * Lancement : `npm run check:idf-live -w apps/api` (lit PRIM_API_KEY dans apps/api/.env).
 */
import { join } from "node:path";
import type { ConfigService } from "@nestjs/config";
import { InMemoryCacheStore } from "../src/shared/cache/in-memory-cache-store";
import { IdfmJourneysAdapter } from "../src/use-cases/transport/ile-de-france-adapters/idfm-journeys.adapter";
import { IdfmNearbyStopsAdapter } from "../src/use-cases/transport/ile-de-france-adapters/idfm-nearby-stops.adapter";
import { PrimDeparturesAdapter } from "../src/use-cases/transport/ile-de-france-adapters/prim-departures.adapter";
import { PrimHttpClient } from "../src/use-cases/transport/ile-de-france-adapters/prim-http-client";
import { PrimQuotas } from "../src/use-cases/transport/ile-de-france-adapters/prim-quotas";

const DAMMARIE_HENRI_WALLON = { latitude: 48.5244, longitude: 2.6437 };
const LA_DEFENSE = { latitude: 48.892, longitude: 2.238 };
const MELUN = "STIF:StopArea:SP:47909:";

async function main(): Promise<void> {
    process.loadEnvFile(join(__dirname, "..", ".env"));
    const configService = { get: (key: string) => process.env[key] } as unknown as ConfigService;
    const primHttpClient = new PrimHttpClient(configService);
    const primQuotas = new PrimQuotas(configService);
    const cacheStore = new InMemoryCacheStore();

    const itineraries = await new IdfmJourneysAdapter(primHttpClient, primQuotas, cacheStore).getItineraries(
        DAMMARIE_HENRI_WALLON,
        LA_DEFENSE,
        false,
    );
    console.log(`\nItinéraires Dammarie → La Défense : ${itineraries.length}`);
    for (const itinerary of itineraries) {
        const transitLegs = itinerary.legs.filter((leg) => leg.lineShortName);
        const summary = transitLegs.map((leg) => `${leg.mode} ${leg.lineShortName} (${leg.dataFreshness}, ${leg.expectedDepartureTime})`);
        console.log(`  ${Math.round(itinerary.durationSeconds / 60)} min : ${summary.join(" → ")}`);
    }

    const stops = await new IdfmNearbyStopsAdapter(primHttpClient, primQuotas, cacheStore).getNearbyStops(
        DAMMARIE_HENRI_WALLON,
        400,
    );
    console.log(`\nArrêts à moins de 400 m d'Henri Wallon : ${stops.length}`);
    for (const stop of stops) {
        console.log(`  ${stop.name} (${stop.distanceMeters} m) : ${stop.lines.map((line) => `${line.mode} ${line.code}`).join(", ")}`);
    }

    const departures = await new PrimDeparturesAdapter(primHttpClient, primQuotas, cacheStore).getNextDepartures(MELUN);
    console.log(`\nProchains passages à Melun : ${departures.length}`);
    for (const departure of departures.slice(0, 6)) {
        console.log(
            `  ${departure.lineRef} vers ${departure.destinationName} : ${departure.expectedTime} (${departure.dataFreshness}, écart ${departure.delaySeconds} s)`,
        );
    }

    console.log(`\nQuota calculateur : ${JSON.stringify(primQuotas.navitia.usage())}`);
    console.log(`Quota prochains passages : ${JSON.stringify(primQuotas.stopMonitoring.usage())}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
