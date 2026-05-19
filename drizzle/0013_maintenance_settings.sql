CREATE TABLE `maintenance_settings` (
  `id` varchar(36) NOT NULL,
  `auto_delete_finished_schedules_enabled` boolean NOT NULL DEFAULT true,
  `auto_delete_finished_schedules_retention_days` int NOT NULL DEFAULT 1,
  `auto_delete_audit_logs_enabled` boolean NOT NULL DEFAULT true,
  `auto_delete_audit_logs_retention_days` int NOT NULL DEFAULT 30,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `maintenance_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `maintenance_settings` (
  `id`,
  `auto_delete_finished_schedules_enabled`,
  `auto_delete_finished_schedules_retention_days`,
  `auto_delete_audit_logs_enabled`,
  `auto_delete_audit_logs_retention_days`
) VALUES ('default', true, 1, true, 30);
