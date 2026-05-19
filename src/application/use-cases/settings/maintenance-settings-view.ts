import { type MaintenanceSettingsRecord } from "#/application/ports/maintenance-settings";

export interface MaintenanceSettingsView {
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
  updatedAt: string;
}

export const toMaintenanceSettingsView = (
  settings: MaintenanceSettingsRecord,
): MaintenanceSettingsView => ({
  autoDeleteUnusedContent: {
    enabled: true,
    retentionDays: settings.autoDeleteUnusedContentRetentionDays,
  },
  autoDeleteUnusedPlaylists: {
    enabled: true,
    retentionDays: settings.autoDeleteUnusedPlaylistsRetentionDays,
  },
  autoDeleteFinishedSchedules: {
    enabled: true,
    retentionDays: settings.autoDeleteFinishedSchedulesRetentionDays,
  },
  autoDeleteAuditLogs: {
    enabled: true,
    retentionDays: settings.autoDeleteAuditLogsRetentionDays,
  },
  updatedAt: settings.updatedAt,
});
