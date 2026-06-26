"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserProfileDtoOutSchema = exports.GetUserProfileDtoInSchema = void 0;
const zod_1 = require("zod");
exports.GetUserProfileDtoInSchema = zod_1.z.object({});
exports.GetUserProfileDtoOutSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string(),
    name: zod_1.z.string().nullable(),
    mobilityProfile: zod_1.z
        .object({
        weightCarbon: zod_1.z.number(),
        weightTime: zod_1.z.number(),
        weightCost: zod_1.z.number(),
        wheelchairAccess: zod_1.z.boolean(),
        avoidStairs: zod_1.z.boolean(),
        preferredModes: zod_1.z.array(zod_1.z.string()),
    })
        .nullable(),
});
