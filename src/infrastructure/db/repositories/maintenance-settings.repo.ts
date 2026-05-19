import { eq } from "drizzle-orm";
import {
  type MaintenanceSettingsRecord,
  type MaintenanceSettingsRepository,
  type MaintenanceSettingsUpdate,
} from "#/application/ports/maintenance-settings";
import { db } from "#/infrastructure/db/client";
import { maintenanceSettings } from "#/infrastructure/db/schema/maintenance-settings.sql";

const MAINTENANCE_SETTINGS_ID = "default";

const mapRow = (
  row: typeof maintenanceSettings.$inferSelect,
): MaintenanceSettingsRecord => ({
  id: row.id,
  autoDeleteUnusedContentEnabled: Boolean(row.autoDeleteUnusedContentEnabled),
  autoDeleteUnusedContentRetentionDays:
    row.autoDeleteUnusedContentRetentionDays,
  autoDeleteUnusedPlaylistsEnabled: Boolean(
    row.autoDeleteUnusedPlaylistsEnabled,
  ),
  autoDeleteUnusedPlaylistsRetentionDays:
    row.autoDeleteUnusedPlaylistsRetentionDays,
  autoDeleteFinishedSchedulesEnabled: Boolean(
    row.autoDeleteFinishedSchedulesEnabled,
  ),
  autoDeleteFinishedSchedulesRetentionDays:
    row.autoDeleteFinishedSchedulesRetentionDays,
  autoDeleteAuditLogsEnabled: Boolean(row.autoDeleteAuditLogsEnabled),
  autoDeleteAuditLogsRetentionDays: row.autoDeleteAuditLogsRetentionDays,
  createdAt:
    row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  updatedAt:
    row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
});

export class MaintenanceSettingsDbRepository
  implements MaintenanceSettingsRepository
{
  async get(): Promise<MaintenanceSettingsRecord> {
    const existing = await db
      .select()
      .from(maintenanceSettings)
      .where(eq(maintenanceSettings.id, MAINTENANCE_SETTINGS_ID))
      .limit(1);

    if (existing[0]) {
      return mapRow(existing[0]);
    }

    const now = new Date();
    await db.insert(maintenanceSettings).values({
      id: MAINTENANCE_SETTINGS_ID,
      autoDeleteUnusedContentEnabled: true,
      autoDeleteUnusedContentRetentionDays: 30,
      autoDeleteUnusedPlaylistsEnabled: true,
      autoDeleteUnusedPlaylistsRetentionDays: 30,
      autoDeleteFinishedSchedulesEnabled: true,
      autoDeleteFinishedSchedulesRetentionDays: 1,
      autoDeleteAuditLogsEnabled: true,
      autoDeleteAuditLogsRetentionDays: 30,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: MAINTENANCE_SETTINGS_ID,
      autoDeleteUnusedContentEnabled: true,
      autoDeleteUnusedContentRetentionDays: 30,
      autoDeleteUnusedPlaylistsEnabled: true,
      autoDeleteUnusedPlaylistsRetentionDays: 30,
      autoDeleteFinishedSchedulesEnabled: true,
      autoDeleteFinishedSchedulesRetentionDays: 1,
      autoDeleteAuditLogsEnabled: true,
      autoDeleteAuditLogsRetentionDays: 30,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async update(
    input: MaintenanceSettingsUpdate,
  ): Promise<MaintenanceSettingsRecord> {
    await this.get();
    await db
      .update(maintenanceSettings)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceSettings.id, MAINTENANCE_SETTINGS_ID));

    return this.get();
  }
}
