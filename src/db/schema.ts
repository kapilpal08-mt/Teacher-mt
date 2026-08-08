import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// Institute table
export const institutes = pgTable("institutes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull().default(""),
  mapsUrl: text("maps_url").default(""), // Admin can add Google Maps link later
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teacher status enum
export const teacherStatusEnum = pgEnum("teacher_status", [
  "active",
  "inactive",
]);

// Teachers table
export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  instituteId: integer("institute_id")
    .references(() => institutes.id, { onDelete: "cascade" })
    .notNull(),
  photoUrl: text("photo_url").default(""),
  bio: text("bio").default(""),
  experience: integer("experience").default(0), // years of experience
  status: teacherStatusEnum("status").default("active").notNull(),
  abilityScore: integer("ability_score").default(0).notNull(), // Starts at 0, increases with votes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Votes table - persists forever, never deleted
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id")
    .references(() => teachers.id, { onDelete: "cascade" })
    .notNull(),
  voterFingerprint: varchar("voter_fingerprint", { length: 128 }).notNull(), // unique per teacher to prevent double voting
  voteType: varchar("vote_type", { length: 10 }).default("up").notNull(), // "up" or "down"
  votedAt: timestamp("voted_at").defaultNow().notNull(),
});

// Vote history log - complete audit trail
export const voteLog = pgTable("vote_log", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id")
    .references(() => teachers.id, { onDelete: "cascade" })
    .notNull(),
  voterFingerprint: varchar("voter_fingerprint", { length: 128 }).notNull(),
  voteType: varchar("vote_type", { length: 10 }).notNull(),
  action: varchar("action", { length: 20 }).notNull(), // "cast", "change", "remove"
  oldVoteType: varchar("old_vote_type", { length: 10 }),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});
