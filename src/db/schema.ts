import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Auth.js tabloları ────────────────────────────────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  language: text("language"), // 'tr' | 'en' — null means use browser default
  theme: text("theme"), // 'light' | 'dark' | 'system' — null means use browser default
  status: text("status").default("pending").notNull(), // 'pending' | 'approved' | 'blocked'
  role: text("role").default("user").notNull(), // 'user' | 'admin'
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ─── Uygulama tabloları ───────────────────────────────────────────────────────

export const favorites = pgTable(
  "favorite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seriesSlug: text("series_slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seriesSlug] })]
);

export const pushSubscriptions = pgTable("push_subscription", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  keys: jsonb("keys").notNull(), // { p256dh, auth }
  seriesEnabled: text("series_enabled").array().default([]).notNull(),
  sessionPreferences: jsonb("session_preferences")
    .$type<Record<string, string[]>>()
    .default({})
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cachedRaces = pgTable(
  "cached_race",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    data: jsonb("data").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cached_race_series_season_round").on(t.seriesSlug, t.season, t.round)]
);

export const cachedStandings = pgTable(
  "cached_standing",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    season: integer("season").notNull(),
    type: text("type").notNull(), // "driver" | "team"
    data: jsonb("data").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cached_standing_series_season_type").on(t.seriesSlug, t.season, t.type)]
);

export const cachedDrivers = pgTable(
  "cached_driver",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    driverId: text("driver_id").notNull(),
    data: jsonb("data").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cached_driver_series_driver").on(t.seriesSlug, t.driverId)]
);

export const cachedRaceDetails = pgTable(
  "cached_race_detail",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    data: jsonb("data").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cached_race_detail_idx").on(t.seriesSlug, t.season, t.round)]
);

export const cachedNews = pgTable(
  "cached_news",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    summary: text("summary"),
    content: text("content"),
    author: text("author"),
    publishedAt: timestamp("published_at"),
    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cached_news_url_idx").on(t.url)]
);

export const sentNotifications = pgTable(
  "sent_notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    sessionType: text("session_type").notNull(),
    notifType: text("notif_type").notNull(), // "pre_1h" | "pre_15m" | "start"
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sent_notification_unique_idx").on(t.seriesSlug, t.season, t.round, t.sessionType, t.notifType)]
);

// Gönderilen her bildirimin (otomatik + manuel) kaydı — yönetim panelindeki
// "son gönderilen bildirimler" listesi ve toplam sayaç için.
export const notificationLog = pgTable(
  "notification_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url"),
    source: text("source").notNull(), // "manual" | "auto"
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (t) => [
    index("notification_log_sent_at_idx").on(t.sentAt),
    index("notification_log_series_sent_at_idx").on(t.seriesSlug, t.sentAt),
  ]
);
