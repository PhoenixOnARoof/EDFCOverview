import { integer, timestamp, varchar, bigint, boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
    id: bigint('id').primaryKey(),
    selectedFrontierId: integer('selected_frontier_id'),
    likesFlexing: boolean('likes_flexing').default(false), // Easter Egg owo)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
    session_id: varchar('session_id', { length: 36 }),
    user_id: bigint('user_id').references(() => users.id).notNull(),
    state: varchar('state', { length: 64 }).notNull(),
    redirectUri: text('redirect_uri').notNull(),
    codeVerifier: text('code_verifier'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at')
}, (table) =>
    [
        primaryKey({
            columns: [
                table.session_id,
                table.user_id
            ]
        })
    ]
);

export const tokens = pgTable('tokens', {
    user_id: bigint('user_id').references(() => users.id),
    frontier_id: integer('frontier_id'),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenType: varchar('token_type', { length: 30 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    scope: text('scope'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (t) => [
    primaryKey({ columns: [t.user_id, t.frontier_id] })
]);

export const frontier = pgTable('frontier', {
    id: integer('frontier_id').primaryKey(),
    cmdrName: varchar('cmdr_name', { length: 100 }),
    carrierName: varchar('carrier_name', { length: 30 }),
    shipName: varchar('ship_name', { length: 100 }),
    credits: bigint('credits'), // Can't believe this has to be a Bigint
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});