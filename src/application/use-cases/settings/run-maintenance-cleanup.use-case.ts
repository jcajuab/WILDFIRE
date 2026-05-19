import { type AuditLogRepository } from "#/application/ports/audit";
import {
  type ContentRepository,
  type ContentStorage,
} from "#/application/ports/content";
import { type DisplayStreamEventPublisher } from "#/application/ports/display-stream-events";
import { type MaintenanceSettingsRepository } from "#/application/ports/maintenance-settings";
import { type PlaylistRepository } from "#/application/ports/playlists";
import { type ScheduleRepository } from "#/application/ports/schedules";
import { type ReconcilePlaylistStatusesUseCase } from "#/application/use-cases/schedules";
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  getCurrentScheduleDateTime,
  getScheduleDateTimeMinusDays,
} from "#/application/use-cases/schedules/shared";

export interface MaintenanceCleanupResult {
  deletedUnusedContent: number;
  deletedUnusedPlaylists: number;
  deletedSchedules: number;
  deletedAuditLogs: number;
  affectedPlaylistIds: string[];
  affectedDisplayIds: string[];
}

export class RunMaintenanceCleanupUseCase {
  constructor(
    private readonly deps: {
      maintenanceSettingsRepository: MaintenanceSettingsRepository;
      contentRepository: ContentRepository;
      contentStorage: ContentStorage;
      playlistRepository: PlaylistRepository;
      scheduleRepository: ScheduleRepository;
      auditLogRepository: AuditLogRepository;
      reconcilePlaylistStatuses: Pick<
        ReconcilePlaylistStatusesUseCase,
        "execute"
      >;
      displayEventPublisher?: DisplayStreamEventPublisher;
      timezone?: string;
    },
  ) {}

  async execute(input?: { now?: Date }): Promise<MaintenanceCleanupResult> {
    const settings = await this.deps.maintenanceSettingsRepository.get();
    const now = input?.now ?? new Date();
    let deletedUnusedContent = 0;
    let deletedUnusedPlaylists = 0;
    let deletedSchedules = 0;
    let deletedAuditLogs = 0;
    let affectedPlaylistIds: string[] = [];
    let affectedDisplayIds: string[] = [];

    if (this.deps.playlistRepository.deleteUnusedBefore != null) {
      const cutoff = new Date(now.getTime());
      cutoff.setUTCDate(
        cutoff.getUTCDate() - settings.autoDeleteUnusedPlaylistsRetentionDays,
      );
      const result = await this.deps.playlistRepository.deleteUnusedBefore({
        cutoff,
        current: getCurrentScheduleDateTime({
          now,
          timezone: this.deps.timezone ?? DEFAULT_SCHEDULE_TIMEZONE,
        }),
      });
      deletedUnusedPlaylists = result.deleted;
      if (result.contentIds.length > 0) {
        await this.deps.contentRepository.refreshUnusedSince?.(
          result.contentIds,
          now,
        );
      }
    }

    if (this.deps.contentRepository.deleteUnusedBefore != null) {
      const cutoff = new Date(now.getTime());
      cutoff.setUTCDate(
        cutoff.getUTCDate() - settings.autoDeleteUnusedContentRetentionDays,
      );
      const deleted =
        await this.deps.contentRepository.deleteUnusedBefore(cutoff);
      deletedUnusedContent = deleted.length;
      for (const record of deleted) {
        await this.deps.contentStorage.delete(record.fileKey);
        if (record.thumbnailKey) {
          await this.deps.contentStorage.delete(record.thumbnailKey);
        }
      }
    }

    if (this.deps.scheduleRepository.deleteFinishedBefore != null) {
      const cutoff = getScheduleDateTimeMinusDays({
        now,
        timezone: this.deps.timezone ?? DEFAULT_SCHEDULE_TIMEZONE,
        days: settings.autoDeleteFinishedSchedulesRetentionDays,
      });
      const result =
        await this.deps.scheduleRepository.deleteFinishedBefore(cutoff);
      deletedSchedules = result.deleted;
      affectedPlaylistIds = result.playlistIds;
      affectedDisplayIds = result.displayIds;
      if (result.contentIds.length > 0) {
        await this.deps.contentRepository.refreshUnusedSince?.(
          result.contentIds,
          now,
        );
      }

      if (affectedPlaylistIds.length > 0) {
        await this.deps.reconcilePlaylistStatuses.execute({
          playlistIds: affectedPlaylistIds,
          now,
        });
      }

      for (const displayId of affectedDisplayIds) {
        this.deps.displayEventPublisher?.publish({
          type: "schedule_updated",
          displayId,
          reason: "finished_schedule_auto_deleted",
          timestamp: now.toISOString(),
        });
      }
    }

    const cutoff = new Date(now.getTime());
    cutoff.setUTCDate(
      cutoff.getUTCDate() - settings.autoDeleteAuditLogsRetentionDays,
    );
    deletedAuditLogs = await this.deps.auditLogRepository.deleteBefore(cutoff);

    return {
      deletedUnusedContent,
      deletedUnusedPlaylists,
      deletedSchedules,
      deletedAuditLogs,
      affectedPlaylistIds,
      affectedDisplayIds,
    };
  }
}
