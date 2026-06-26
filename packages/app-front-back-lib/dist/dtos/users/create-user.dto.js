"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserDtoOutSchema = exports.CreateUserDtoInSchema = void 0;
const zod_1 = require("zod");
exports.CreateUserDtoInSchema = zod_1.z.object({
    email: zod_1.z.email(),
    name: zod_1.z.string().min(2).max(100).nullable(),
    password: zod_1.z.string().min(8).max(100),
});
exports.CreateUserDtoOutSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string(),
    name: zod_1.z.string().nullable(),
});
