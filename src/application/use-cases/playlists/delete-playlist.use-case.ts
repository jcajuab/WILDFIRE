import { type ContentRepository } from "#/application/ports/content";
import { type DisplayStreamEventPublisher } from "#/application/ports/display-stream-events";
import { type DisplayRepository } from "#/application/ports/displays";
import { type PlaylistRepository } from "#/application/ports/playlists";
import { type ScheduleRepository } from "#/application/ports/schedules";
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  getCurrentScheduleDateTime,
  isScheduleFinished,
} from "#/application/use-cases/schedules/shared";
import { NotFoundError, PlaylistInUseError } from "./errors";
import { deletePlaylistForOwner, findPlaylistByIdForOwner } from "./shared";

export class DeletePlaylistUseCase {
  constructor(
    private readonly deps: {
      playlistRepository: PlaylistRepository;
      contentRepository: ContentRepository;
      scheduleRepository: ScheduleRepository;
      displayRepository: DisplayRepository;
      displayEventPublisher?: DisplayStreamEventPublisher;
      timezone?: string;
    },
  ) {}

  async execute(input: { id: string; ownerId?: string }) {
    const playlist = await findPlaylistByIdForOwner(
      this.deps.playlistRepository,
      input.id,
      input.ownerId,
    );
    if (!playlist) throw new NotFoundError("Playlist not found");

    const schedules = await this.deps.scheduleRepository.listByPlaylistId(
      input.id,
    );
    const current = getCurrentScheduleDateTime({
      timezone: this.deps.timezone ?? DEFAULT_SCHEDULE_TIMEZONE,
    });
    const unfinishedSchedules = schedules.filter(
      (schedule) => !isScheduleFinished(schedule, current),
    );
    if (unfinishedSchedules.length > 0) {
      const displayIds = Array.from(
        new Set(unfinishedSchedules.map((s) => s.displayId)),
      );
      const displays = await this.deps.displayRepository.findByIds(displayIds);
      const firstDisplay = displays[0];
      const displayName =
        displays.length === 0 || !firstDisplay
          ? "a display"
          : firstDisplay.name?.trim() || firstDisplay.slug || "a display";
      const message =
        displayIds.length > 1
          ? "Failed to delete playlist. This playlist is in use by multiple displays."
          : `Failed to delete playlist. This playlist is in use by ${displayName}.`;
      throw new PlaylistInUseError(message);
    }

    for (const schedule of schedules) {
      const deleted = await this.deps.scheduleRepository.delete(schedule.id);
      if (deleted) {
        this.deps.displayEventPublisher?.publish({
          type: "schedule_updated",
          displayId: schedule.displayId,
          reason: "finished_schedule_deleted_with_playlist",
        });
      }
    }

    const deleted = await deletePlaylistForOwner(
      this.deps.playlistRepository,
      input.id,
      input.ownerId,
    );
    if (!deleted) throw new NotFoundError("Playlist not found");
  }
}
