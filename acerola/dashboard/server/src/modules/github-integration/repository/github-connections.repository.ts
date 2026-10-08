import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lt } from 'drizzle-orm';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  githubConnections,
  githubOauthStates,
} from '../../../lib/db/schema/github-connections.schema';

@Injectable()
export class GithubConnectionsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async find(userId: string) {
    const [row] = await this.db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async save(data: typeof githubConnections.$inferInsert) {
    await this.db
      .insert(githubConnections)
      .values(data)
      .onConflictDoUpdate({
        target: githubConnections.userId,
        set: { ...data, updatedAt: new Date() },
      });
  }

  async remove(userId: string) {
    await this.db.delete(githubConnections).where(eq(githubConnections.userId, userId));
  }

  async createState(data: typeof githubOauthStates.$inferInsert) {
    await this.db.delete(githubOauthStates).where(lt(githubOauthStates.expiresAt, new Date()));
    await this.db.insert(githubOauthStates).values(data);
  }

  async consumeState(stateHash: string, browserHash: string) {
    // DELETE RETURNING consome uma única vez, inclusive com dois callbacks simultâneos.
    const [row] = await this.db
      .delete(githubOauthStates)
      .where(
        and(
          eq(githubOauthStates.stateHash, stateHash),
          eq(githubOauthStates.browserHash, browserHash),
          gt(githubOauthStates.expiresAt, new Date()),
        ),
      )
      .returning();
    return row ?? null;
  }
}
