import { type AuditLogRepository } from "#/application/ports/audit";
import { type DisplayStreamEventPublisher } from "#/application/ports/display-stream-events";
import { type MaintenanceSettingsRepository } from "#/application/ports/maintenance-settings";
import { type ScheduleRepository } from "#/application/ports/schedules";
import { type ReconcilePlaylistStatusesUseCase } from "#/application/use-cases/schedules";
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  getScheduleDateTimeMinusDays,
} from "#/application/use-cases/schedules/shared";

export interface MaintenanceCleanupResult {
  deletedSchedules: number;
  deletedAuditLogs: number;
  affectedPlaylistIds: string[];
  affectedDisplayIds: string[];
}

export class RunMaintenanceCleanupUseCase {
  constructor(
    private readonly deps: {
      maintenanceSettingsRepository: MaintenanceSettingsRepository;
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
    let deletedSchedules = 0;
    let deletedAuditLogs = 0;
    let affectedPlaylistIds: string[] = [];
    let affectedDisplayIds: string[] = [];

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
      deletedSchedules,
      deletedAuditLogs,
      affectedPlaylistIds,
      affectedDisplayIds,
    };
  }
}
