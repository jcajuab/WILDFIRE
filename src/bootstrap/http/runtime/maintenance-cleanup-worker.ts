import { type AuditLogRepository } from "#/application/ports/audit";
import {
  type ContentRepository,
  type ContentStorage,
} from "#/application/ports/content";
import { type DisplayStreamEventPublisher } from "#/application/ports/display-stream-events";
import { type MaintenanceSettingsRepository } from "#/application/ports/maintenance-settings";
import { type PlaylistRepository } from "#/application/ports/playlists";
import { type ScheduleRepository } from "#/application/ports/schedules";
import { ReconcilePlaylistStatusesUseCase } from "#/application/use-cases/schedules";
import { RunMaintenanceCleanupUseCase } from "#/application/use-cases/settings";
import { logger } from "#/infrastructure/observability/logger";
import { addErrorContext } from "#/infrastructure/observability/logging";
import { invalidateServerCache } from "#/infrastructure/redis/server-cache";

const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_PLAYLIST_RECONCILE_INTERVAL_MS = 60 * 1000;

export const startMaintenanceCleanupWorker = (input: {
  maintenanceSettingsRepository: MaintenanceSettingsRepository;
  contentRepository: ContentRepository;
  contentStorage: ContentStorage;
  playlistRepository: PlaylistRepository;
  scheduleRepository: ScheduleRepository;
  auditLogRepository: AuditLogRepository;
  displayEventPublisher?: DisplayStreamEventPublisher;
  timezone?: string;
  cleanupIntervalMs?: number;
  playlistReconcileIntervalMs?: number;
}): (() => Promise<void>) => {
  let stopped = false;
  let running: Promise<void> | null = null;

  const reconcilePlaylistStatuses = new ReconcilePlaylistStatusesUseCase({
    playlistRepository: input.playlistRepository,
    scheduleRepository: input.scheduleRepository,
    timezone: input.timezone,
  });
  const cleanup = new RunMaintenanceCleanupUseCase({
    maintenanceSettingsRepository: input.maintenanceSettingsRepository,
    contentRepository: input.contentRepository,
    contentStorage: input.contentStorage,
    playlistRepository: input.playlistRepository,
    scheduleRepository: input.scheduleRepository,
    auditLogRepository: input.auditLogRepository,
    reconcilePlaylistStatuses,
    displayEventPublisher: input.displayEventPublisher,
    timezone: input.timezone,
  });

  const runCleanup = async (): Promise<void> => {
    if (stopped || running !== null) return;
    const execution = (async () => {
      try {
        const result = await cleanup.execute();
        if (
          result.deletedUnusedContent > 0 ||
          result.deletedUnusedPlaylists > 0 ||
          result.deletedSchedules > 0 ||
          result.deletedAuditLogs > 0
        ) {
          await invalidateServerCache(["content", "schedules", "playlists"]);
          logger.info(
            {
              component: "maintenance",
              event: "maintenance.cleanup.completed",
              deletedUnusedContent: result.deletedUnusedContent,
              deletedUnusedPlaylists: result.deletedUnusedPlaylists,
              deletedSchedules: result.deletedSchedules,
              deletedAuditLogs: result.deletedAuditLogs,
            },
            "Maintenance cleanup completed",
          );
        }
      } catch (error) {
        logger.warn(
          addErrorContext(
            {
              component: "maintenance",
              event: "maintenance.cleanup.failed",
            },
            error,
          ),
          "Maintenance cleanup iteration failed",
        );
      }
    })();
    running = execution;

    try {
      await execution;
    } finally {
      if (running === execution) {
        running = null;
      }
    }
  };

  const runPlaylistReconcile = async (): Promise<void> => {
    if (stopped) return;
    try {
      const result = await reconcilePlaylistStatuses.execute();
      if (result.updated > 0) {
        await invalidateServerCache(["playlists"]);
      }
    } catch (error) {
      logger.warn(
        addErrorContext(
          {
            component: "maintenance",
            event: "playlist-status.reconcile.failed",
          },
          error,
        ),
        "Playlist status reconcile iteration failed",
      );
    }
  };

  const cleanupTimer = setInterval(() => {
    if (!stopped) void runCleanup();
  }, input.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS);
  const playlistTimer = setInterval(() => {
    if (!stopped) void runPlaylistReconcile();
  }, input.playlistReconcileIntervalMs ??
    DEFAULT_PLAYLIST_RECONCILE_INTERVAL_MS);

  void runCleanup();
  void runPlaylistReconcile();

  return async () => {
    stopped = true;
    clearInterval(cleanupTimer);
    clearInterval(playlistTimer);
    await (running ?? Promise.resolve());
  };
};
