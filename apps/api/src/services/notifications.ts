import { notifications, type Db } from '@opentournament/database';
import { emitUserEvent } from './realtime.js';

export async function notify(
  db: Db,
  userIds: string[],
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  for (const userId of unique) {
    await db.insert(notifications).values({ userId, type, payload });
    emitUserEvent(userId, 'notification.created', { type, payload });
  }
}
