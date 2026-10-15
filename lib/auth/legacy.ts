import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import {
  approvals,
  documents,
  events,
  matters,
  participants,
} from "../db/schema";

/**
 * Before accounts moved here, a person was the OrangeCat actor id, and every
 * `*_sub` column held it. When someone signs in with OrangeCat, their old rows
 * are re-keyed to the account they now have, once: the matter they opened
 * yesterday is still theirs today.
 *
 * Idempotent (a second run finds nothing to change) and keyed on the actor id
 * OrangeCat signed, never on an email address.
 */
export async function adoptLegacyMatters(
  db: Db,
  actorId: string,
  userId: string,
): Promise<void> {
  if (!actorId || actorId === userId) return;
  await db.transaction(async (tx) => {
    // A participant row is keyed (matter, sub): if the new id already sits in
    // a matter, drop the old row rather than collide with it.
    const mine = await tx
      .select({ matterId: participants.matterId })
      .from(participants)
      .where(eq(participants.sub, userId));
    for (const { matterId } of mine) {
      await tx
        .delete(participants)
        .where(
          and(
            eq(participants.matterId, matterId),
            eq(participants.sub, actorId),
          ),
        );
    }
    await tx
      .update(participants)
      .set({ sub: userId })
      .where(eq(participants.sub, actorId));
    await tx
      .update(matters)
      .set({ ownerSub: userId })
      .where(eq(matters.ownerSub, actorId));
    await tx
      .update(events)
      .set({ actor: userId })
      .where(eq(events.actor, actorId));
    await tx
      .update(approvals)
      .set({ decidedBySub: userId })
      .where(eq(approvals.decidedBySub, actorId));
    await tx
      .update(documents)
      .set({ createdBySub: userId })
      .where(eq(documents.createdBySub, actorId));
  });
}
