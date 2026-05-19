import { describe, expect, test } from "bun:test";
import { type AuditLogRepository } from "#/application/ports/audit";
import { type MaintenanceSettingsRepository } from "#/application/ports/maintenance-settings";
import { type PlaylistRepository } from "#/application/ports/playlists";
import { type ScheduleRepository } from "#/application/ports/schedules";
import { ReconcilePlaylistStatusesUseCase } from "#/application/use-cases/schedules";
import { RunMaintenanceCleanupUseCase } from "#/application/use-cases/settings";

describe("maintenance cleanup", () => {
  test("reconciles playlist status using unfinished schedules only", async () => {
    const state: { status: "DRAFT" | "IN_USE" } = { status: "IN_USE" };
    const playlistRepository = {
      list: async () => [],
      findById: async () => ({
        id: "playlist-1",
        name: "Morning",
        description: null,
        status: state.status,
        showCounter: false,
        ownerId: "user-1",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      }),
      updateStatus: async (_id: string, nextStatus: "DRAFT" | "IN_USE") => {
        state.status = nextStatus;
      },
    } as unknown as PlaylistRepository;
    const scheduleRepository = {
      listByPlaylistId: async () => [
        {
          id: "schedule-1",
          name: "Finished",
          kind: "PLAYLIST",
          playlistId: "playlist-1",
          contentId: null,
          displayId: "display-1",
          startDate: "2026-05-19",
          endDate: "2026-05-19",
          startTime: "08:00",
          endTime: "09:00",
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
      ],
    } as unknown as ScheduleRepository;

    const useCase = new ReconcilePlaylistStatusesUseCase({
      playlistRepository,
      scheduleRepository,
      timezone: "UTC",
    });

    await useCase.execute({
      playlistIds: ["playlist-1"],
      now: new Date("2026-05-20T00:00:00.000Z"),
    });

    expect(state.status).toBe("DRAFT");
  });

  test("cleanup uses configured retention windows", async () => {
    const scheduleCutoffs: Array<{ date: string; time: string }> = [];
    const auditCutoffs: Date[] = [];
    const maintenanceSettingsRepository = {
      get: async () => ({
        id: "default",
        autoDeleteFinishedSchedulesEnabled: true,
        autoDeleteFinishedSchedulesRetentionDays: 1,
        autoDeleteAuditLogsEnabled: true,
        autoDeleteAuditLogsRetentionDays: 30,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      }),
      update: async () => {
        throw new Error("not used");
      },
    } as MaintenanceSettingsRepository;
    const scheduleRepository = {
      deleteFinishedBefore: async (input: { date: string; time: string }) => {
        scheduleCutoffs.push(input);
        return {
          deleted: 2,
          playlistIds: ["playlist-1"],
          displayIds: ["display-1"],
        };
      },
    } as unknown as ScheduleRepository;
    const auditLogRepository = {
      deleteBefore: async (cutoff: Date) => {
        auditCutoffs.push(cutoff);
        return 3;
      },
    } as unknown as AuditLogRepository;
    const useCase = new RunMaintenanceCleanupUseCase({
      maintenanceSettingsRepository,
      scheduleRepository,
      auditLogRepository,
      reconcilePlaylistStatuses: { execute: async () => ({ updated: 1 }) },
      timezone: "UTC",
    });

    const result = await useCase.execute({
      now: new Date("2026-05-20T12:30:00.000Z"),
    });

    expect(result.deletedSchedules).toBe(2);
    expect(result.deletedAuditLogs).toBe(3);
    expect(scheduleCutoffs[0]).toEqual({
      date: "2026-05-19",
      time: "12:30",
    });
    expect(auditCutoffs[0]?.toISOString()).toBe("2026-04-20T12:30:00.000Z");
  });

  test("cleanup runs even when legacy enabled flags are false", async () => {
    let deletedFinishedSchedules = 0;
    let deletedAuditLogs = 0;
    const maintenanceSettingsRepository = {
      get: async () => ({
        id: "default",
        autoDeleteFinishedSchedulesEnabled: false,
        autoDeleteFinishedSchedulesRetentionDays: 1,
        autoDeleteAuditLogsEnabled: false,
        autoDeleteAuditLogsRetentionDays: 30,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      }),
      update: async () => {
        throw new Error("not used");
      },
    } as MaintenanceSettingsRepository;
    const scheduleRepository = {
      deleteFinishedBefore: async () => {
        deletedFinishedSchedules += 1;
        return {
          deleted: 1,
          playlistIds: [],
          displayIds: [],
        };
      },
    } as unknown as ScheduleRepository;
    const auditLogRepository = {
      deleteBefore: async () => {
        deletedAuditLogs += 1;
        return 1;
      },
    } as unknown as AuditLogRepository;
    const useCase = new RunMaintenanceCleanupUseCase({
      maintenanceSettingsRepository,
      scheduleRepository,
      auditLogRepository,
      reconcilePlaylistStatuses: { execute: async () => ({ updated: 0 }) },
      timezone: "UTC",
    });

    const result = await useCase.execute({
      now: new Date("2026-05-20T12:30:00.000Z"),
    });

    expect(deletedFinishedSchedules).toBe(1);
    expect(deletedAuditLogs).toBe(1);
    expect(result.deletedSchedules).toBe(1);
    expect(result.deletedAuditLogs).toBe(1);
  });
});
