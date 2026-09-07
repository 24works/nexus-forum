import { getDb, ensureSchema, now } from "@/lib/db";
import { PublicUser } from "@/lib/types";

/** Appends an immutable entry to the moderation audit log. */
export async function audit(
  actor: PublicUser | null,
  action: string,
  targetType?: string,
  targetId?: number,
  details?: string
): Promise<void> {
  await ensureSchema();
  await getDb()
    .prepare(
      "INSERT INTO audit_log (actor_user_id, actor_username, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      actor?.id ?? null,
      actor?.username ?? null,
      action,
      targetType ?? null,
      targetId ?? null,
      typeof details === "string" ? details.slice(0, 2000) : null,
      now()
    )
    .run();
}