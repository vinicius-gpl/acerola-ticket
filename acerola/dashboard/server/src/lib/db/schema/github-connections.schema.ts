import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// A identidade local continua sendo fornecida pelo autenticador da instalação.
export const githubConnections = pgTable('github_connections', {
  userId: text('user_id').primaryKey(),
  githubId: text('github_id').notNull().unique(),
  login: text('login').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
  refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const githubOauthStates = pgTable('github_oauth_states', {
  stateHash: text('state_hash').primaryKey(),
  userId: text('user_id').notNull(),
  browserHash: text('browser_hash').notNull(),
  codeVerifier: text('code_verifier').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});
