import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── Manufacturers ──────────────────────────────────────────
export const manufacturers = sqliteTable('manufacturers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  country: text('country'),
  createdAt: text('created_at').notNull().default('NOW'),
});

// ── Product Lines ──────────────────────────────────────────
export const productLines = sqliteTable('product_lines', {
  id: text('id').primaryKey(),
  manufacturerId: text('manufacturer_id').notNull().references(() => manufacturers.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  category: text('category').notNull(), // furnace, ac, heat_pump, air_handler
});

// ── Models ─────────────────────────────────────────────────
export const models = sqliteTable('models', {
  id: text('id').primaryKey(),
  productLineId: text('product_line_id').notNull().references(() => productLines.id),
  modelNumber: text('model_number').notNull(),
  modelNumberNormalized: text('model_number_normalized').notNull(),
  description: text('description'),
  refrigerantType: text('refrigerant_type'),
  voltage: text('voltage'),
  btuRating: integer('btu_rating'),
  seerRating: real('seer_rating'),
  region: text('region'), // JSON array as text
  productionStart: text('production_start'),
  productionEnd: text('production_end'),
});

// ── Serial Ranges ──────────────────────────────────────────
export const serialRanges = sqliteTable('serial_ranges', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull().references(() => models.id),
  serialPrefix: text('serial_prefix'),
  serialStart: text('serial_start'),
  serialEnd: text('serial_end'),
  productionDateStart: text('production_date_start'),
  productionDateEnd: text('production_date_end'),
  factoryCode: text('factory_code'),
  variant: text('variant'),
  region: text('region'),
});

// ── Manuals ────────────────────────────────────────────────
export const manuals = sqliteTable('manuals', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull().references(() => models.id),
  title: text('title').notNull(),
  manualType: text('manual_type').notNull(), // installation, service, parts, wiring
  sourceRef: text('source_ref'),
});

export const manualRevisions = sqliteTable('manual_revisions', {
  id: text('id').primaryKey(),
  manualId: text('manual_id').notNull().references(() => manuals.id),
  revisionCode: text('revision_code').notNull(),
  publicationDate: text('publication_date').notNull(),
  isCurrent: integer('is_current', { mode: 'boolean' }).default(true),
  changesSummary: text('changes_summary'),
});

// ── Bulletins ──────────────────────────────────────────────
export const bulletins = sqliteTable('bulletins', {
  id: text('id').primaryKey(),
  manufacturerId: text('manufacturer_id').notNull().references(() => manufacturers.id),
  bulletinNumber: text('bulletin_number').notNull(),
  title: text('title').notNull(),
  publicationDate: text('publication_date').notNull(),
  severity: text('severity').notNull(), // safety_critical, warranty, informational, recall
  status: text('status').notNull().default('active'), // active, superseded, expired
  supersededById: text('superseded_by_id'),
  contentSummary: text('content_summary'),
});

export const bulletinApplicability = sqliteTable('bulletin_applicability', {
  id: text('id').primaryKey(),
  bulletinId: text('bulletin_id').notNull().references(() => bulletins.id),
  modelId: text('model_id').notNull().references(() => models.id),
  serialRangeId: text('serial_range_id'),
  appliesToAllSerials: integer('applies_to_all_serials', { mode: 'boolean' }).default(false),
  notes: text('notes'),
});

// ── Parts ──────────────────────────────────────────────────
export const parts = sqliteTable('parts', {
  id: text('id').primaryKey(),
  manufacturerId: text('manufacturer_id').notNull().references(() => manufacturers.id),
  partNumber: text('part_number').notNull(),
  partNumberNormalized: text('part_number_normalized').notNull(),
  description: text('description').notNull(),
  category: text('category'), // compressor, blower_motor, capacitor, contactor, etc.
  status: text('status').default('active'), // active, discontinued, superseded
});

export const partSupersessions = sqliteTable('part_supersessions', {
  id: text('id').primaryKey(),
  oldPartId: text('old_part_id').notNull().references(() => parts.id),
  newPartId: text('new_part_id').notNull().references(() => parts.id),
  supersessionDate: text('supersession_date'),
  installationNotes: text('installation_notes'),
  sourceBulletinId: text('source_bulletin_id'),
});

export const modelParts = sqliteTable('model_parts', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull().references(() => models.id),
  partId: text('part_id').notNull().references(() => parts.id),
  quantity: integer('quantity').default(1),
  positionCode: text('position_code'),
  isFieldReplaceable: integer('is_field_replaceable', { mode: 'boolean' }).default(true),
});

// ── Suppliers ──────────────────────────────────────────────
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // distributor, wholesaler, oem_direct
  city: text('city'),
  state: text('state'),
  phone: text('phone'),
  lat: real('lat'),
  lng: real('lng'),
});

export const supplierInventory = sqliteTable('supplier_inventory', {
  id: text('id').primaryKey(),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  partId: text('part_id').notNull().references(() => parts.id),
  stockQuantity: integer('stock_quantity'),
  priceCents: integer('price_cents'),
  leadTimeDays: integer('lead_time_days'),
  lastCheckedAt: text('last_checked_at'),
});

// ── Service Reports ────────────────────────────────────────
export const serviceReports = sqliteTable('service_reports', {
  id: text('id').primaryKey(),
  technicianName: text('technician_name').notNull(),
  modelId: text('model_id').references(() => models.id),
  serialNumber: text('serial_number'),
  status: text('status').default('draft'), // draft, submitted, approved
  arrivalCondition: text('arrival_condition'), // JSON
  diagnosis: text('diagnosis'), // JSON
  workPerformed: text('work_performed'), // JSON
  measurementsPost: text('measurements_post'), // JSON
  technicianNotes: text('technician_notes'),
  createdAt: text('created_at').notNull(),
  submittedAt: text('submitted_at'),
});

// ── Analytics Events ───────────────────────────────────────
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  metadata: text('metadata'), // JSON
  createdAt: text('created_at').notNull(),
});

// ── Service Sessions ───────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  technicianName: text('technician_name').notNull(),
  status: text('status').notNull().default('active'), // active, completed, archived
  equipmentModelId: text('equipment_model_id').references(() => models.id),
  serialNumber: text('serial_number'),
  siteAddress: text('site_address'),
  customerName: text('customer_name'),
  reportId: text('report_id').references(() => serviceReports.id),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

export const sessionMessages = sqliteTable('session_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  role: text('role').notNull(), // 'user' | 'system'
  messageType: text('message_type').notNull(), // 'text' | 'equipment_identified' | 'bulletin_alert' | 'parts_info' | 'measurement' | 'report_generated' | 'suggestion'
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON - structured data for rich rendering
  createdAt: text('created_at').notNull(),
});
