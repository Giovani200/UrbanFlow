import { z as zod } from "zod";

export const FavoriteAddressSchema = zod.object({
    id: zod.string(),
    label: zod.string(),
    address: zod.string(),
    latitude: zod.number(),
    longitude: zod.number(),
});
export type FavoriteAddress = zod.output<typeof FavoriteAddressSchema>;

export const CreateFavoriteAddressDtoInSchema = zod.object({
    label: zod.string().trim().min(1).max(60),
    address: zod.string().trim().min(1).max(255),
    latitude: zod.number().min(-90).max(90),
    longitude: zod.number().min(-180).max(180),
});
export type CreateFavoriteAddressDtoIn = zod.output<typeof CreateFavoriteAddressDtoInSchema>;

export const CreateFavoriteAddressDtoOutSchema = FavoriteAddressSchema;
export type CreateFavoriteAddressDtoOut = zod.output<typeof CreateFavoriteAddressDtoOutSchema>;

export const ListFavoriteAddressesDtoOutSchema = zod.array(FavoriteAddressSchema);
export type ListFavoriteAddressesDtoOut = zod.output<typeof ListFavoriteAddressesDtoOutSchema>;

export const DeleteFavoriteAddressDtoInSchema = zod.object({
    id: zod.string().min(1),
});
export type DeleteFavoriteAddressDtoIn = zod.output<typeof DeleteFavoriteAddressDtoInSchema>;

export const DeleteFavoriteAddressDtoOutSchema = zod.object({ success: zod.literal(true) });
export type DeleteFavoriteAddressDtoOut = zod.output<typeof DeleteFavoriteAddressDtoOutSchema>;
