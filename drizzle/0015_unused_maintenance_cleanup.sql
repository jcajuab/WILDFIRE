ALTER TABLE `content` ADD `unused_since` timestamp;
--> statement-breakpoint
CREATE INDEX `content_unused_since_idx` ON `content` (`unused_since`);
--> statement-breakpoint
ALTER TABLE `playlists` ADD `unused_since` timestamp;
--> statement-breakpoint
CREATE INDEX `playlists_unused_since_idx` ON `playlists` (`unused_since`);
--> statement-breakpoint
ALTER TABLE `maintenance_settings` ADD `auto_delete_unused_content_enabled` boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `maintenance_settings` ADD `auto_delete_unused_content_retention_days` int NOT NULL DEFAULT 30;
--> statement-breakpoint
ALTER TABLE `maintenance_settings` ADD `auto_delete_unused_playlists_enabled` boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `maintenance_settings` ADD `auto_delete_unused_playlists_retention_days` int NOT NULL DEFAULT 30;
--> statement-breakpoint
UPDATE `content` c
SET `unused_since` = c.`updated_at`
WHERE NOT EXISTS (
  SELECT 1 FROM `playlist_items` pi WHERE pi.`content_id` = c.`id`
)
AND NOT EXISTS (
  SELECT 1 FROM `schedule_content_targets` sct WHERE sct.`content_id` = c.`id`
)
AND NOT EXISTS (
  SELECT 1 FROM `emergency_slots` es WHERE es.`content_id` = c.`id`
);
--> statement-breakpoint
UPDATE `playlists` p
SET `unused_since` = p.`updated_at`
WHERE p.`status` = 'DRAFT';
