export interface MaintenanceSettingsRecord {
  id: string;
  autoDeleteUnusedContentEnabled: boolean;
  autoDeleteUnusedContentRetentionDays: number;
  autoDeleteUnusedPlaylistsEnabled: boolean;
  autoDeleteUnusedPlaylistsRetentionDays: number;
  autoDeleteFinishedSchedulesEnabled: boolean;
  autoDeleteFinishedSchedulesRetentionDays: number;
  autoDeleteAuditLogsEnabled: boolean;
  autoDeleteAuditLogsRetentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceSettingsUpdate {
  autoDeleteUnusedContentEnabled?: boolean;
  autoDeleteUnusedContentRetentionDays?: number;
  autoDeleteUnusedPlaylistsEnabled?: boolean;
  autoDeleteUnusedPlaylistsRetentionDays?: number;
  autoDeleteFinishedSchedulesEnabled?: boolean;
  autoDeleteFinishedSchedulesRetentionDays?: number;
  autoDeleteAuditLogsEnabled?: boolean;
  autoDeleteAuditLogsRetentionDays?: number;
}

export interface MaintenanceSettingsRepository {
  get(): Promise<MaintenanceSettingsRecord>;
  update(input: MaintenanceSettingsUpdate): Promise<MaintenanceSettingsRecord>;
}
