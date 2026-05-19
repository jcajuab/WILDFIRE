import { type MaintenanceSettingsRecord } from "#/application/ports/maintenance-settings";

export interface MaintenanceSettingsView {
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
