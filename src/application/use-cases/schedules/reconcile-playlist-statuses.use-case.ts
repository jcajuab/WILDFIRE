import { type AdminDisplayLifecycleEventPublisher } from "#/application/ports/display-stream-events";
import { type PlaylistRepository } from "#/application/ports/playlists";
import { type ScheduleRepository } from "#/application/ports/schedules";
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  getCurrentScheduleDateTime,
  isScheduleFinished,
} from "./shared";

export class ReconcilePlaylistStatusesUseCase {
  constructor(
    private readonly deps: {
      playlistRepository: PlaylistRepository;
      scheduleRepository: ScheduleRepository;
      adminLifecycleEventPublisher?: AdminDisplayLifecycleEventPublisher;
      timezone?: string;
    },
  ) {}

  async execute(input?: {
    playlistIds?: readonly string[];
    now?: Date;
  }): Promise<{ updated: number }> {
    const playlistIds =
      input?.playlistIds != null
        ? Array.from(new Set(input.playlistIds))
        : (await this.deps.playlistRepository.list()).map(
            (playlist) => playlist.id,
          );

    if (playlistIds.length === 0) {
      return { updated: 0 };
    }

    const current = getCurrentScheduleDateTime({
      now: input?.now,
      timezone: this.deps.timezone ?? DEFAULT_SCHEDULE_TIMEZONE,
    });

    let updated = 0;
    for (const playlistId of playlistIds) {
      const playlist = await this.deps.playlistRepository.findById(playlistId);
      if (!playlist) continue;

      const unfinishedCount =
        this.deps.scheduleRepository.countUnfinishedByPlaylistId != null
          ? await this.deps.scheduleRepository.countUnfinishedByPlaylistId(
              playlistId,
              current,
            )
          : (
              await this.deps.scheduleRepository.listByPlaylistId(playlistId)
            ).filter((schedule) => !isScheduleFinished(schedule, current))
              .length;

      const nextStatus = unfinishedCount > 0 ? "IN_USE" : "DRAFT";
      if (playlist.status === nextStatus) {
        continue;
      }

      await this.deps.playlistRepository.updateStatus(playlistId, nextStatus);
      updated += 1;
      this.deps.adminLifecycleEventPublisher?.publish({
        type: "playlist_status_changed",
        playlistId,
        status: nextStatus,
        occurredAt: new Date().toISOString(),
      });
    }

    return { updated };
  }
}
