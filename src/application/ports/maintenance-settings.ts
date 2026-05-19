export interface MaintenanceSettingsRecord {
  id: string;
  autoDeleteFinishedSchedulesEnabled: boolean;
  autoDeleteFinishedSchedulesRetentionDays: number;
  autoDeleteAuditLogsEnabled: boolean;
  autoDeleteAuditLogsRetentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceSettingsUpdate {
  autoDeleteFinishedSchedulesEnabled?: boolean;
  autoDeleteFinishedSchedulesRetentionDays?: number;
  autoDeleteAuditLogsEnabled?: boolean;
  autoDeleteAuditLogsRetentionDays?: number;
}

export interface MaintenanceSettingsRepository {
  get(): Promise<MaintenanceSettingsRecord>;
  update(input: MaintenanceSettingsUpdate): Promise<MaintenanceSettingsRecord>;
}
