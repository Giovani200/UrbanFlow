import { describe, expect, it } from "vitest";
import { toSiriMonitoringRef } from "./stop-point-ref";

describe("toSiriMonitoringRef", () => {
    it("traduit un point d'arrêt ferré", () => {
        expect(toSiriMonitoringRef("stop_point:IDFM:monomodalStopPlace:47909")).toBe("STIF:StopArea:SP:47909:");
    });

    it("traduit un quai de bus", () => {
        expect(toSiriMonitoringRef("stop_point:IDFM:31051")).toBe("STIF:StopPoint:Q:31051:");
    });

    it("refuse une zone d'arrêt, dont le numéro ne correspond pas à SIRI", () => {
        expect(toSiriMonitoringRef("stop_area:IDFM:61926")).toBeNull();
    });
});
