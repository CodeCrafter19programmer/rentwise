import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type UserRole = "admin" | "manager" | "tenant";
export type UnitStatus = "vacant" | "occupied" | "maintenance";
export type PaymentStatus = "pending" | "paid" | "overdue" | "partial";
export type MaintenanceStatus = "open" | "in_progress" | "resolved";
export type MaintenancePriority = "low" | "medium" | "high";

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").$type<UserRole>().notNull().default("tenant"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  managerId: varchar("manager_id").references(() => profiles.id),
  imageUrl: text("image_url"),
  totalUnits: integer("total_units").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const units = pgTable("units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  unitNumber: text("unit_number").notNull(),
  bedrooms: integer("bedrooms").default(1),
  bathrooms: decimal("bathrooms").default("1"),
  sqft: integer("sqft"),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").$type<UnitStatus>().notNull().default("vacant"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leases = pgTable("leases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id").references(() => units.id).notNull(),
  tenantId: varchar("tenant_id").references(() => profiles.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaseId: varchar("lease_id").references(() => leases.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  status: text("status").$type<PaymentStatus>().notNull().default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceRequests = pgTable("maintenance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id").references(() => units.id).notNull(),
  tenantId: varchar("tenant_id").references(() => profiles.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").$type<MaintenancePriority>().notNull().default("medium"),
  status: text("status").$type<MaintenanceStatus>().notNull().default("open"),
  vendorId: varchar("vendor_id"),
  vendorName: text("vendor_name"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => profiles.id).notNull(),
  receiverId: varchar("receiver_id").references(() => profiles.id).notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true });
export const insertUnitSchema = createInsertSchema(units).omit({ id: true, createdAt: true });
export const insertLeaseSchema = createInsertSchema(leases).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type Lease = typeof leases.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type User = Profile;
export type InsertUser = InsertProfile;
