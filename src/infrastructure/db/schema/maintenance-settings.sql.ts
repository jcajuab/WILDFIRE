import {
  boolean,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const maintenanceSettings = mysqlTable("maintenance_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  autoDeleteUnusedContentEnabled: boolean("auto_delete_unused_content_enabled")
    .notNull()
    .default(true),
  autoDeleteUnusedContentRetentionDays: int(
    "auto_delete_unused_content_retention_days",
  )
    .notNull()
    .default(30),
  autoDeleteUnusedPlaylistsEnabled: boolean(
    "auto_delete_unused_playlists_enabled",
  )
    .notNull()
    .default(true),
  autoDeleteUnusedPlaylistsRetentionDays: int(
    "auto_delete_unused_playlists_retention_days",
  )
    .notNull()
    .default(30),
  autoDeleteFinishedSchedulesEnabled: boolean(
    "auto_delete_finished_schedules_enabled",
  )
    .notNull()
    .default(true),
  autoDeleteFinishedSchedulesRetentionDays: int(
    "auto_delete_finished_schedules_retention_days",
  )
    .notNull()
    .default(1),
  autoDeleteAuditLogsEnabled: boolean("auto_delete_audit_logs_enabled")
    .notNull()
    .default(true),
  autoDeleteAuditLogsRetentionDays: int("auto_delete_audit_logs_retention_days")
    .notNull()
    .default(30),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
