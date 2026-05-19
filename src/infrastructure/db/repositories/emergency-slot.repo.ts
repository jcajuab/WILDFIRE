import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  type EmergencySlotRecord,
  type EmergencySlotRepository,
} from "#/application/ports/emergency-slots";
import { db } from "#/infrastructure/db/client";
import { content } from "#/infrastructure/db/schema/content.sql";
import { emergencySlots } from "#/infrastructure/db/schema/emergency-slots.sql";
import { playlistItems } from "#/infrastructure/db/schema/playlist-item.sql";
import { scheduleContentTargets } from "#/infrastructure/db/schema/schedule.sql";

const mapRowToRecord = (
  row: typeof emergencySlots.$inferSelect,
): EmergencySlotRecord => ({
  slotIndex: row.slotIndex,
  label: row.label,
  contentId: row.contentId ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export class EmergencySlotDbRepository implements EmergencySlotRepository {
  async list(): Promise<EmergencySlotRecord[]> {
    const rows = await db
      .select()
      .from(emergencySlots)
      .orderBy(asc(emergencySlots.slotIndex));
    return rows.map(mapRowToRecord);
  }

  async findByIndex(slotIndex: number): Promise<EmergencySlotRecord | null> {
    const rows = await db
      .select()
      .from(emergencySlots)
      .where(eq(emergencySlots.slotIndex, slotIndex))
      .limit(1);
    return rows[0] ? mapRowToRecord(rows[0]) : null;
  }

  async upsert(input: {
    slotIndex: number;
    label: string;
    contentId: string | null;
    at: Date;
  }): Promise<EmergencySlotRecord> {
    const existing = await this.findByIndex(input.slotIndex);
    await db
      .insert(emergencySlots)
      .values({
        slotIndex: input.slotIndex,
        label: input.label,
        contentId: input.contentId,
        createdAt: input.at,
        updatedAt: input.at,
      })
      .onDuplicateKeyUpdate({
        set: {
          label: input.label,
          contentId: input.contentId,
          updatedAt: input.at,
        },
      });

    const stored = await this.findByIndex(input.slotIndex);
    if (!stored) {
      throw new Error("Failed to upsert emergency slot");
    }
    if (input.contentId) {
      await markContentUsed([input.contentId], input.at);
    }
    if (existing?.contentId && existing.contentId !== input.contentId) {
      await refreshContentUnusedSince([existing.contentId], input.at);
    }
    return stored;
  }

  async delete(slotIndex: number): Promise<boolean> {
    const existing = await this.findByIndex(slotIndex);
    const result = await db
      .delete(emergencySlots)
      .where(eq(emergencySlots.slotIndex, slotIndex));
    const deleted = (result[0]?.affectedRows ?? 0) > 0;
    if (deleted && existing?.contentId) {
      await refreshContentUnusedSince([existing.contentId], new Date());
    }
    return deleted;
  }
}

const contentReferenceExists = (contentIdColumn = content.id) =>
  sql`exists (select 1 from ${playlistItems} where ${playlistItems.contentId} = ${contentIdColumn})
    or exists (select 1 from ${scheduleContentTargets} where ${scheduleContentTargets.contentId} = ${contentIdColumn})
    or exists (select 1 from ${emergencySlots} where ${emergencySlots.contentId} = ${contentIdColumn})`;

const markContentUsed = async (ids: readonly string[], at: Date) => {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;
  await db
    .update(content)
    .set({ unusedSince: null, updatedAt: at })
    .where(inArray(content.id, uniqueIds));
};

const refreshContentUnusedSince = async (ids: readonly string[], at: Date) => {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;
  await db
    .update(content)
    .set({ unusedSince: null })
    .where(and(inArray(content.id, uniqueIds), contentReferenceExists()));
  await db
    .update(content)
    .set({ unusedSince: at })
    .where(
      and(
        inArray(content.id, uniqueIds),
        isNull(content.unusedSince),
        sql`not (${contentReferenceExists()})`,
      ),
    );
};
