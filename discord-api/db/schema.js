import { pgTable, varchar, text, timestamp, boolean, integer, index, serial } from 'drizzle-orm/pg-core';

export const discordOAuthSessions = pgTable('discord_oauth_sessions', {
  sessionId: varchar('session_id', { length: 36 }).primaryKey(),
  discordUserId: varchar('discord_user_id', { length: 20 }).notNull(),
  state: varchar('state', { length: 64 }).notNull(),
  redirectUri: text('redirect_uri').notNull(),
  codeVerifier: text('code_verifier'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  discordUserIdIdx: index('idx_discord_oauth_sessions_discord_user_id').on(table.discordUserId),
  stateIdx: index('idx_discord_oauth_sessions_state').on(table.state),
}));

export const discordOAuthTokens = pgTable('discord_oauth_tokens', {
  id: serial('id').primaryKey(),
  discordUserId: varchar('discord_user_id', { length: 20 }).notNull(),
  frontierCustomerId: varchar('frontier_customer_id', { length: 20 }),
  cmdrName: varchar('cmdr_name', { length: 100 }),
  carrierName: varchar('carrier_name', { length: 20 }),
  carrierId: varchar('carrier_id', { length: 10 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenType: varchar('token_type', { length: 20 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  scope: text('scope'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  discordUserIdIdx: index('idx_discord_oauth_tokens_discord_user_id').on(table.discordUserId),
}));

export const discordUserSettings = pgTable('discord_user_settings', {
  id: serial('id').primaryKey(),
  discordUserId: varchar('discord_user_id', { length: 20 }).notNull().unique(),
  defaultAccountId: integer('default_account_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  discordUserIdIdx: index('idx_discord_user_settings_discord_user_id').on(table.discordUserId),
}));
