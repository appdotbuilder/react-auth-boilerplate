import { serial, text, pgTable, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table for storing user account information
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(), // Unique email constraint
  password_hash: text('password_hash').notNull(), // Hashed password storage
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  is_active: boolean('is_active').notNull().default(true), // Account status
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sessions table for managing user authentication sessions
export const sessionsTable = pgTable('sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // Unique session token
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Define relations between tables
export const usersRelations = relations(usersTable, ({ many }) => ({
  sessions: many(sessionsTable)
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect; // For SELECT operations
export type NewUser = typeof usersTable.$inferInsert; // For INSERT operations

export type Session = typeof sessionsTable.$inferSelect; // For SELECT operations
export type NewSession = typeof sessionsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  sessions: sessionsTable 
};