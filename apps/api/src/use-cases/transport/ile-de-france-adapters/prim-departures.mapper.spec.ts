import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapStopMonitoring, SiriStopMonitoringResponseSchema, type SiriStopMonitoringResponse } from "./prim-departures.mapper";

function readFixture(name: string): SiriStopMonitoringResponse {
    return SiriStopMonitoringResponseSchema.parse(JSON.parse(readFileSync(join(__dirname, "__fixtures__", name), "utf-8")));
}

const busResponse = readFixture("stop-monitoring-bus.json");
const railResponse = readFixture("stop-monitoring-rail.json");
const BUS_RECORDED_AT = Date.parse("2026-10-14T09:27:31.000Z");

function departureAt(response: SiriStopMonitoringResponse, now: number, scheduledTime: string) {
    return mapStopMonitoring(response, new Date(now)).find((departure) => departure.scheduledTime === scheduledTime);
}

describe("mapStopMonitoring", () => {
    it("traduit un passage de bus en temps réel frais", () => {
        const departure = departureAt(busResponse, BUS_RECORDED_AT + 30_000, "2026-10-14T11:31:00+02:00");

        expect(departure).toEqual({
            lineRef: "C00881",
            destinationName: "Chamlys",
            scheduledTime: "2026-10-14T11:31:00+02:00",
            expectedTime: "2026-10-14T11:32:17+02:00",
            delaySeconds: 77,
            dataFreshness: "realtime",
        });
    });

    it("rétrograde en horaire prévu une donnée de plus de 2 minutes", () => {
        const departure = departureAt(busResponse, BUS_RECORDED_AT + 3 * 60_000, "2026-10-14T11:31:00+02:00");

        expect(departure?.dataFreshness).toBe("scheduled");
        expect(departure?.expectedTime).toBe("2026-10-14T11:31:00+02:00");
        expect(departure?.delaySeconds).toBe(0);
    });

    it("prend l'heure d'arrivée au terminus, sans heure de départ", () => {
        const now = Date.parse("2026-10-14T09:28:48.282Z");
        const terminus = departureAt(railResponse, now, "2026-10-14T11:34:40+02:00");

        expect(terminus).toEqual(
            expect.objectContaining({
                lineRef: "C01728",
                destinationName: "Melun",
                expectedTime: "2026-10-14T11:36:19+02:00",
                delaySeconds: 99,
                dataFreshness: "realtime",
            }),
        );
    });

    it("traite comme prévue une estimation chargée dans la nuit", () => {
        const now = Date.parse("2026-10-14T09:28:48.282Z");
        const nightlyLoaded = departureAt(railResponse, now, "2026-10-14T11:39:40+02:00");

        expect(nightlyLoaded?.dataFreshness).toBe("scheduled");
    });

    it("ignore un passage sans aucune heure", () => {
        const visit = busResponse.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit?.[0];
        const withoutTimes: SiriStopMonitoringResponse = {
            Siri: {
                ServiceDelivery: {
                    StopMonitoringDelivery: [
                        {
                            MonitoredStopVisit: visit
                                ? [{ ...visit, MonitoredVehicleJourney: { ...visit.MonitoredVehicleJourney, MonitoredCall: {} } }]
                                : [],
                        },
                    ],
                },
            },
        };

        expect(mapStopMonitoring(withoutTimes, new Date(BUS_RECORDED_AT))).toEqual([]);
    });

    it("trie les passages par heure estimée", () => {
        const departures = mapStopMonitoring(railResponse, new Date("2026-10-14T09:28:48.282Z"));
        const expectedTimes = departures.map((departure) => departure.expectedTime);

        expect(expectedTimes).toEqual([...expectedTimes].sort());
    });
});
