import { z } from "zod";
import { apiResponseSchema } from "#/interfaces/http/responses";

export const maintenanceSettingsSchema = z.object({
  autoDeleteFinishedSchedules: z.object({
    enabled: z.boolean(),
    retentionDays: z.number().int().min(1).max(3650),
  }),
  autoDeleteAuditLogs: z.object({
    enabled: z.boolean(),
    retentionDays: z.number().int().min(1).max(3650),
  }),
  updatedAt: z.string(),
});

export const updateMaintenanceSettingsSchema = maintenanceSettingsSchema.omit({
  updatedAt: true,
});

export const maintenanceSettingsResponseSchema = apiResponseSchema(
  maintenanceSettingsSchema,
);
