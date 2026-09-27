import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const orgs = pgTable("orgs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  reportingCurrency: text("reporting_currency").notNull().default("USD"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memberships_org_user").on(t.orgId, t.userId)],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mandates = pgTable("mandates", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  asset: text("asset").notNull().default("USDC"),
  network: text("network").notNull().default("Avalanche"),
  vaultId: text("vault_id"),
  monthlyLimitCents: integer("monthly_limit_cents").notNull(),
  usedCents: integer("used_cents").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  mandateId: uuid("mandate_id").references(() => mandates.id),
  vaultId: text("vault_id").notNull(),
  vaultName: text("vault_name").notNull(),
  network: text("network").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("Pending"),
  shares: text("shares"),
  ownerAddress: text("owner_address").notNull(),
  requestId: text("request_id"),
  approveTxHash: text("approve_tx_hash"),
  requestTxHash: text("request_tx_hash"),
  claimTxHash: text("claim_tx_hash"),
  settlement: text("settlement"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  event: text("event").notNull(),
  detail: text("detail").notNull(),
  tone: text("tone").notNull().default("good"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
