import { ValidationError } from "#/application/errors/validation";
import { type MaintenanceSettingsRepository } from "#/application/ports/maintenance-settings";
import {
  type MaintenanceSettingsView,
  toMaintenanceSettingsView,
} from "./maintenance-settings-view";

const assertRetentionDays = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    throw new ValidationError(`${label} retention must be 1-3650 days`);
  }
};

export class UpdateMaintenanceSettingsUseCase {
  constructor(
    private readonly deps: {
      maintenanceSettingsRepository: MaintenanceSettingsRepository;
    },
  ) {}

  async execute(input: {
    autoDeleteUnusedContent: {
      enabled: boolean;
      retentionDays: number;
    };
    autoDeleteUnusedPlaylists: {
      enabled: boolean;
      retentionDays: number;
    };
    autoDeleteFinishedSchedules: {
      enabled: boolean;
      retentionDays: number;
    };
    autoDeleteAuditLogs: {
      enabled: boolean;
      retentionDays: number;
    };
  }): Promise<MaintenanceSettingsView> {
    assertRetentionDays(
      input.autoDeleteUnusedContent.retentionDays,
      "Unused content",
    );
    assertRetentionDays(
      input.autoDeleteUnusedPlaylists.retentionDays,
      "Unused playlists",
    );
    assertRetentionDays(
      input.autoDeleteFinishedSchedules.retentionDays,
      "Finished schedules",
    );
    assertRetentionDays(input.autoDeleteAuditLogs.retentionDays, "Audit logs");

    return toMaintenanceSettingsView(
      await this.deps.maintenanceSettingsRepository.update({
        autoDeleteUnusedContentEnabled: true,
        autoDeleteUnusedContentRetentionDays:
          input.autoDeleteUnusedContent.retentionDays,
        autoDeleteUnusedPlaylistsEnabled: true,
        autoDeleteUnusedPlaylistsRetentionDays:
          input.autoDeleteUnusedPlaylists.retentionDays,
        autoDeleteFinishedSchedulesEnabled: true,
        autoDeleteFinishedSchedulesRetentionDays:
          input.autoDeleteFinishedSchedules.retentionDays,
        autoDeleteAuditLogsEnabled: true,
        autoDeleteAuditLogsRetentionDays:
          input.autoDeleteAuditLogs.retentionDays,
      }),
    );
  }
}
