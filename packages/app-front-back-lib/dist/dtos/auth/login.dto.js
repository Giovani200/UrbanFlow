"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginDtoOutSchema = exports.LoginDtoInSchema = void 0;
const zod_1 = require("zod");
exports.LoginDtoInSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(1),
});
exports.LoginDtoOutSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string(),
    name: zod_1.z.string().nullable(),
});
