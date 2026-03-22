import { db } from '@/db';
import {
  sessions,
  sessionMessages,
  models,
  productLines,
  manufacturers,
  bulletins,
  bulletinApplicability,
  parts,
  modelParts,
  partSupersessions,
  suppliers,
  supplierInventory,
  manuals,
  manualRevisions,
  serialRanges,
  serviceReports,
} from '@/db/schema';
import { eq, like, and, or, desc, asc, ne, sql } from 'drizzle-orm';
import crypto from 'crypto';

interface ResponseMessage {
  role: 'system';
  messageType: string;
  content: string;
  metadata: string;
}

// ── Intent Detection ─────────────────────────────────────────

const MODEL_NUMBER_PATTERN = /\b[A-Za-z0-9]{2,}[-][A-Za-z0-9-]{5,}\b/;

function detectIntent(message: string): string {
  const lower = message.toLowerCase();

  // Order matters: more specific intents first

  if (/generate report|create report|finish|done|wrap up|close out|submit report/i.test(lower)) {
    return 'generate_report';
  }

  if (/part number|capacitor|contactor|fan motor|control board|flame sensor|what part|which part|replacement/i.test(lower)) {
    return 'parts_query';
  }

  if (/bulletin|advisory|recall|safety|notice|any bulletins|updates/i.test(lower)) {
    return 'bulletin_query';
  }

  if (/not cooling|not heating|won't start|won't start|short cycling|noisy|leaking|ice|frost|error|fault|humming|tripping/i.test(lower)) {
    return 'diagnostic';
  }

  if (/manual|procedure|how to|steps for|wiring diagram|charge|superheat|subcooling/i.test(lower)) {
    return 'manual_query';
  }

  if (/where to buy|supplier|stock|availability|price|order|pick up|in stock/i.test(lower)) {
    return 'supplier_query';
  }

  if (MODEL_NUMBER_PATTERN.test(message) || /identify|looking at|working on/i.test(lower)) {
    return 'equipment_id';
  }

  return 'unknown';
}

// ── Symptom → Component Mapping ──────────────────────────────

const SYMPTOM_MAP: Record<string, { components: string[]; steps: string[] }> = {
  'not cooling': {
    components: ['capacitor', 'contactor', 'compressor', 'thermostat'],
    steps: [
      'Verify thermostat is calling for cooling',
      'Check voltage at contactor coil',
      'Test run capacitor with meter (compare to rated uF)',
      'Check compressor amp draw against nameplate RLA',
      'Inspect contactor contact surfaces for pitting',
    ],
  },
  'not heating': {
    components: ['igniter', 'gas valve', 'flame sensor', 'control board', 'thermostat'],
    steps: [
      'Verify thermostat is calling for heat',
      'Check for fault/error codes on control board',
      'Inspect igniter for cracks (measure resistance: 40-200 ohms typical)',
      'Clean flame sensor with fine abrasive pad',
      'Verify gas pressure at manifold',
    ],
  },
  "won't start": {
    components: ['capacitor', 'contactor', 'compressor', 'thermostat'],
    steps: [
      'Verify power at disconnect',
      'Check thermostat signal wire voltage',
      'Test capacitor (should read within 10% of rated uF)',
      'Inspect contactor for welded contacts or coil failure',
      'Check compressor windings for open/short/ground',
    ],
  },
  humming: {
    components: ['capacitor', 'contactor', 'compressor'],
    steps: [
      'Humming typically indicates a stuck motor or bad capacitor',
      'Test run capacitor immediately',
      'Check for locked rotor amps on compressor',
      'Inspect contactor — humming coil may indicate low voltage',
    ],
  },
  'short cycling': {
    components: ['refrigerant charge', 'filter', 'high pressure switch'],
    steps: [
      'Check and replace air filter if dirty',
      'Verify refrigerant pressures (compare to charging chart)',
      'Check high pressure switch — reset if tripped',
      'Inspect condenser coil for blockage',
      'Verify condenser fan motor operation',
    ],
  },
  ice: {
    components: ['airflow', 'refrigerant charge', 'defrost board', 'TXV'],
    steps: [
      'Check air filter and return airflow',
      'Verify blower motor is operating at correct speed',
      'Check refrigerant charge — low charge causes evaporator icing',
      'Inspect TXV for proper superheat (heat pump systems)',
      'Test defrost board and sensors (heat pump systems)',
    ],
  },
  frost: {
    components: ['airflow', 'refrigerant charge', 'defrost board', 'TXV'],
    steps: [
      'Same diagnostic path as icing condition',
      'Check air filter and return airflow',
      'Verify refrigerant charge and superheat',
      'Inspect outdoor coil defrost system on heat pumps',
    ],
  },
  noisy: {
    components: ['fan motor bearings', 'compressor mounts', 'loose panels'],
    steps: [
      'Identify noise source: indoor or outdoor unit',
      'Check fan blade for damage or debris contact',
      'Inspect motor bearings — spin by hand, feel for roughness',
      'Check compressor mounting grommets for deterioration',
      'Tighten all panel screws and inspect for vibration contact',
    ],
  },
  leaking: {
    components: ['drain pan', 'condensate line', 'refrigerant fittings'],
    steps: [
      'Identify leak type: water or refrigerant',
      'For water: check condensate drain line for blockage',
      'Inspect drain pan for cracks or overflow',
      'For refrigerant: perform leak search with electronic detector',
      'Check service valve caps and flare connections',
    ],
  },
  error: {
    components: ['control board', 'sensors', 'wiring'],
    steps: [
      'Record exact error/fault code from control board',
      'Cross-reference code with service manual',
      'Check related sensors and wiring for the indicated fault',
      'Inspect control board for burned components or loose connections',
    ],
  },
  fault: {
    components: ['control board', 'sensors', 'wiring'],
    steps: [
      'Record fault code LED pattern or display',
      'Refer to unit service manual for code lookup',
      'Check wiring connections at control board terminals',
      'Test sensors indicated by fault code',
    ],
  },
  tripping: {
    components: ['compressor', 'wiring', 'breaker', 'ground fault'],
    steps: [
      'Check compressor windings for short to ground (megohmmeter)',
      'Inspect wiring for chafing or damaged insulation',
      'Verify breaker is properly sized per nameplate MCA',
      'Check amp draw against nameplate — compare RLA and LRA',
    ],
  },
};

// ── Prior History Lookup ─────────────────────────────────────

interface PriorSessionSummary {
  sessionId: string;
  date: string;
  technician: string;
  diagnosis: string | null;
  partsReplaced: string[];
  status: string;
  customerName: string | null;
}

async function findPriorHistory(
  currentSessionId: string,
  equipmentModelId: string | null,
  customerName: string | null,
  database: typeof db
): Promise<PriorSessionSummary[]> {
  if (!equipmentModelId && !customerName) return [];

  const conditions = [];
  if (equipmentModelId) {
    conditions.push(eq(sessions.equipmentModelId, equipmentModelId));
  }
  if (customerName) {
    conditions.push(like(sessions.customerName, `%${customerName}%`));
  }

  const priorSessions = await database
    .select({
      id: sessions.id,
      technicianName: sessions.technicianName,
      status: sessions.status,
      customerName: sessions.customerName,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(
      and(
        ne(sessions.id, currentSessionId),
        or(...conditions)
      )
    )
    .orderBy(desc(sessions.createdAt))
    .limit(10);

  if (priorSessions.length === 0) return [];

  const summaries: PriorSessionSummary[] = await Promise.all(
    priorSessions.map(async (prior) => {
      const messages = await database
        .select({
          messageType: sessionMessages.messageType,
          content: sessionMessages.content,
          metadata: sessionMessages.metadata,
        })
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, prior.id))
        .orderBy(asc(sessionMessages.createdAt));

      let diagnosis: string | null = null;
      const partsReplaced: string[] = [];

      for (const msg of messages) {
        if (msg.messageType === 'suggestion' && msg.metadata) {
          try {
            const meta = JSON.parse(msg.metadata);
            if (meta.symptoms) {
              diagnosis = meta.symptoms.join(', ');
            }
          } catch { /* skip */ }
        }
        if (msg.messageType === 'parts_info' && msg.metadata) {
          try {
            const meta = JSON.parse(msg.metadata);
            if (meta.parts && Array.isArray(meta.parts)) {
              for (const p of meta.parts) {
                if (p.partNumber) partsReplaced.push(p.partNumber);
              }
            }
          } catch { /* skip */ }
        }
      }

      return {
        sessionId: prior.id,
        date: prior.createdAt,
        technician: prior.technicianName,
        diagnosis,
        partsReplaced,
        status: prior.status,
        customerName: prior.customerName,
      };
    })
  );

  return summaries;
}

// ── Handler Functions ────────────────────────────────────────

async function handleEquipmentId(
  message: string,
  sessionId: string,
  database: typeof db
): Promise<ResponseMessage[]> {
  const responses: ResponseMessage[] = [];

  // Try to extract a model number from the message
  const modelMatch = message.match(MODEL_NUMBER_PATTERN);
  const searchTerm = modelMatch ? modelMatch[0] : message;

  // Search models table
  const matchedModels = await database
    .select({
      id: models.id,
      modelNumber: models.modelNumber,
      description: models.description,
      refrigerantType: models.refrigerantType,
      voltage: models.voltage,
      btuRating: models.btuRating,
      seerRating: models.seerRating,
      productionStart: models.productionStart,
      productionEnd: models.productionEnd,
      productLine: productLines.name,
      productLineCategory: productLines.category,
      manufacturer: manufacturers.name,
    })
    .from(models)
    .innerJoin(productLines, eq(models.productLineId, productLines.id))
    .innerJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
    .where(like(models.modelNumber, `%${searchTerm}%`))
    .limit(5);

  if (matchedModels.length === 0) {
    responses.push({
      role: 'system',
      messageType: 'text',
      content: `I couldn't find a match for "${searchTerm}". Please double-check the model number and try again. You can usually find it on the unit's data plate.`,
      metadata: JSON.stringify({ searchTerm, matchFound: false }),
    });
    return responses;
  }

  const equipment = matchedModels[0];

  // Update session with equipment context
  await database
    .update(sessions)
    .set({ equipmentModelId: equipment.id })
    .where(eq(sessions.id, sessionId));

  // Check for serial number in message
  const serialMatch = message.match(/\b([A-Za-z]\d{6,}|\d{8,})\b/);
  if (serialMatch) {
    await database
      .update(sessions)
      .set({ serialNumber: serialMatch[0] })
      .where(eq(sessions.id, sessionId));
  } else {
    responses.push({
      role: 'system',
      messageType: 'text',
      content: "Got it. Do you have the serial number on the data plate? It's needed for warranty documentation.",
      metadata: JSON.stringify({ askingForSerial: true }),
    });
  }

  // Get serial ranges
  const ranges = await database
    .select()
    .from(serialRanges)
    .where(eq(serialRanges.modelId, equipment.id));

  // Build identification response
  const specs = [
    equipment.btuRating ? `${(equipment.btuRating / 1000).toFixed(0)}k BTU` : null,
    equipment.seerRating ? `${equipment.seerRating} SEER` : null,
    equipment.voltage || null,
    equipment.refrigerantType || null,
  ]
    .filter(Boolean)
    .join(' | ');

  responses.push({
    role: 'system',
    messageType: 'equipment_identified',
    content: `Identified: ${equipment.manufacturer} ${equipment.productLine} — ${equipment.modelNumber}${specs ? ` (${specs})` : ''}. ${equipment.description || ''}`.trim(),
    metadata: JSON.stringify({
      equipment,
      serialRanges: ranges,
      matchCount: matchedModels.length,
      allMatches: matchedModels.length > 1 ? matchedModels : undefined,
    }),
  });

  // Check for safety-critical bulletins
  const applicableBulletins = await database
    .select({
      id: bulletins.id,
      bulletinNumber: bulletins.bulletinNumber,
      title: bulletins.title,
      severity: bulletins.severity,
      publicationDate: bulletins.publicationDate,
      contentSummary: bulletins.contentSummary,
      status: bulletins.status,
    })
    .from(bulletins)
    .innerJoin(bulletinApplicability, eq(bulletins.id, bulletinApplicability.bulletinId))
    .where(
      and(
        eq(bulletinApplicability.modelId, equipment.id),
        eq(bulletins.status, 'active'),
        or(eq(bulletins.severity, 'safety_critical'), eq(bulletins.severity, 'recall'))
      )
    );

  if (applicableBulletins.length > 0) {
    const bulletinSummaries = applicableBulletins
      .map((b) => `[${b.severity.toUpperCase()}] ${b.bulletinNumber}: ${b.title}`)
      .join('\n');

    responses.push({
      role: 'system',
      messageType: 'bulletin_alert',
      content: `SAFETY ALERT: ${applicableBulletins.length} active safety bulletin(s) for this equipment:\n${bulletinSummaries}`,
      metadata: JSON.stringify({ bulletins: applicableBulletins }),
    });
  }

  // Check for prior service history by equipment and/or customer
  const [currentSession] = await database
    .select({ customerName: sessions.customerName })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const priorHistory = await findPriorHistory(
    sessionId,
    equipment.id,
    currentSession?.customerName || null,
    database
  );

  if (priorHistory.length > 0) {
    const latest = priorHistory[0];
    const dateStr = new Date(latest.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const diagnosisPart = latest.diagnosis ? ` — ${latest.diagnosis}` : '';
    const partsPart =
      latest.partsReplaced.length > 0
        ? `\nParts involved: ${latest.partsReplaced.join(', ')}.`
        : '';
    const additionalCount = priorHistory.length > 1
      ? `\n${priorHistory.length - 1} additional prior session(s) on file.`
      : '';

    responses.push({
      role: 'system',
      messageType: 'text',
      content: `I found prior service history for this equipment. It was last serviced on ${dateStr} by ${latest.technician}${diagnosisPart}.${partsPart}${additionalCount}\nThis may be relevant to today's call.`,
      metadata: JSON.stringify({ priorHistory }),
    });
  }

  return responses;
}

async function handlePartsQuery(
  message: string,
  sessionId: string,
  database: typeof db
): Promise<ResponseMessage[]> {
  const [session] = await database
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session?.equipmentModelId) {
    return [
      {
        role: 'system',
        messageType: 'text',
        content:
          'I need to know what equipment you are working on first. Please provide the model number.',
        metadata: JSON.stringify({ needsEquipmentContext: true }),
      },
    ];
  }

  // Determine part category filter from message keywords
  const lower = message.toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    capacitor: ['capacitor', 'cap'],
    contactor: ['contactor'],
    blower_motor: ['fan motor', 'blower motor', 'blower'],
    control_board: ['control board', 'board', 'circuit board'],
    flame_sensor: ['flame sensor'],
    compressor: ['compressor'],
    igniter: ['igniter', 'ignitor'],
  };

  let categoryFilter: string | null = null;
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      categoryFilter = category;
      break;
    }
  }

  // Query parts for this model
  const partConditions = [eq(modelParts.modelId, session.equipmentModelId)];

  const modelPartsResults = await database
    .select({
      partId: parts.id,
      partNumber: parts.partNumber,
      description: parts.description,
      category: parts.category,
      status: parts.status,
      quantity: modelParts.quantity,
      positionCode: modelParts.positionCode,
      isFieldReplaceable: modelParts.isFieldReplaceable,
    })
    .from(modelParts)
    .innerJoin(parts, eq(modelParts.partId, parts.id))
    .where(eq(modelParts.modelId, session.equipmentModelId));

  // Filter by category if specified
  let filteredParts = modelPartsResults;
  if (categoryFilter) {
    filteredParts = modelPartsResults.filter(
      (p) => p.category === categoryFilter || p.description.toLowerCase().includes(categoryFilter!.replace('_', ' '))
    );
  }

  // Resolve supersession chains and get supplier info for each part
  const partsWithDetails = await Promise.all(
    filteredParts.map(async (part) => {
      // Check for supersession
      let currentPart = part;
      let supersededBy: { partNumber: string; partId: string; installationNotes: string | null } | null = null;

      if (part.status === 'superseded') {
        const [supersession] = await database
          .select({
            newPartId: partSupersessions.newPartId,
            installationNotes: partSupersessions.installationNotes,
          })
          .from(partSupersessions)
          .where(eq(partSupersessions.oldPartId, part.partId))
          .limit(1);

        if (supersession) {
          const [newPart] = await database
            .select()
            .from(parts)
            .where(eq(parts.id, supersession.newPartId))
            .limit(1);

          if (newPart) {
            supersededBy = {
              partNumber: newPart.partNumber,
              partId: newPart.id,
              installationNotes: supersession.installationNotes,
            };
          }
        }
      }

      // Get top 3 suppliers by stock
      const topSuppliers = await database
        .select({
          supplierName: suppliers.name,
          supplierType: suppliers.type,
          city: suppliers.city,
          state: suppliers.state,
          phone: suppliers.phone,
          stockQuantity: supplierInventory.stockQuantity,
          priceCents: supplierInventory.priceCents,
          leadTimeDays: supplierInventory.leadTimeDays,
        })
        .from(supplierInventory)
        .innerJoin(suppliers, eq(supplierInventory.supplierId, suppliers.id))
        .where(eq(supplierInventory.partId, supersededBy?.partId || part.partId))
        .orderBy(desc(supplierInventory.stockQuantity))
        .limit(3);

      return {
        ...part,
        supersededBy,
        suppliers: topSuppliers,
      };
    })
  );

  if (partsWithDetails.length === 0) {
    return [
      {
        role: 'system',
        messageType: 'text',
        content: categoryFilter
          ? `No ${categoryFilter.replace('_', ' ')} parts found for this equipment. Try asking about a different component.`
          : 'No parts found for this equipment model.',
        metadata: JSON.stringify({ categoryFilter }),
      },
    ];
  }

  const partsList = partsWithDetails
    .map((p) => {
      let line = `${p.partNumber} — ${p.description}`;
      if (p.status === 'superseded' && p.supersededBy) {
        line += ` (SUPERSEDED by ${p.supersededBy.partNumber})`;
      }
      if (p.suppliers.length > 0) {
        const best = p.suppliers[0];
        const price = best.priceCents ? `$${(best.priceCents / 100).toFixed(2)}` : 'call for price';
        line += ` — ${best.stockQuantity} in stock at ${best.supplierName} (${price})`;
      }
      return line;
    })
    .join('\n');

  return [
    {
      role: 'system',
      messageType: 'parts_info',
      content: `Found ${partsWithDetails.length} part(s)${categoryFilter ? ` matching "${categoryFilter.replace('_', ' ')}"` : ''}:\n${partsList}`,
      metadata: JSON.stringify({ parts: partsWithDetails }),
    },
  ];
}

async function handleBulletinQuery(
  sessionId: string,
  database: typeof db
): Promise<ResponseMessage[]> {
  const [session] = await database
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session?.equipmentModelId) {
    return [
      {
        role: 'system',
        messageType: 'text',
        content:
          'I need to know what equipment you are working on to check bulletins. Please provide the model number.',
        metadata: JSON.stringify({ needsEquipmentContext: true }),
      },
    ];
  }

  const applicableBulletins = await database
    .select({
      id: bulletins.id,
      bulletinNumber: bulletins.bulletinNumber,
      title: bulletins.title,
      severity: bulletins.severity,
      publicationDate: bulletins.publicationDate,
      contentSummary: bulletins.contentSummary,
      status: bulletins.status,
      notes: bulletinApplicability.notes,
    })
    .from(bulletins)
    .innerJoin(bulletinApplicability, eq(bulletins.id, bulletinApplicability.bulletinId))
    .where(
      and(eq(bulletinApplicability.modelId, session.equipmentModelId), eq(bulletins.status, 'active'))
    )
    .orderBy(desc(bulletins.publicationDate));

  if (applicableBulletins.length === 0) {
    return [
      {
        role: 'system',
        messageType: 'bulletin_alert',
        content: 'No active bulletins found for this equipment.',
        metadata: JSON.stringify({ bulletins: [] }),
      },
    ];
  }

  const bulletinList = applicableBulletins
    .map(
      (b) =>
        `[${b.severity.toUpperCase()}] ${b.bulletinNumber}: ${b.title} (${b.publicationDate})`
    )
    .join('\n');

  return [
    {
      role: 'system',
      messageType: 'bulletin_alert',
      content: `${applicableBulletins.length} active bulletin(s) for this equipment:\n${bulletinList}`,
      metadata: JSON.stringify({ bulletins: applicableBulletins }),
    },
  ];
}

async function handleDiagnostic(message: string): Promise<ResponseMessage[]> {
  const lower = message.toLowerCase();

  const matchedSymptoms: string[] = [];
  const allComponents = new Set<string>();
  const allSteps: string[] = [];

  for (const [symptom, data] of Object.entries(SYMPTOM_MAP)) {
    if (lower.includes(symptom)) {
      matchedSymptoms.push(symptom);
      data.components.forEach((c) => allComponents.add(c));
      allSteps.push(`--- ${symptom.toUpperCase()} ---`);
      data.steps.forEach((step, i) => allSteps.push(`${i + 1}. ${step}`));
    }
  }

  if (matchedSymptoms.length === 0) {
    return [
      {
        role: 'system',
        messageType: 'suggestion',
        content:
          'I detected a potential issue but need more detail. Can you describe the symptom? For example: not cooling, not heating, short cycling, noisy, leaking, icing, error codes.',
        metadata: JSON.stringify({ suggestions: Object.keys(SYMPTOM_MAP) }),
      },
    ];
  }

  const componentList = Array.from(allComponents).join(', ');
  const checklist = allSteps.join('\n');

  return [
    {
      role: 'system',
      messageType: 'suggestion',
      content: `Diagnostic checklist for: ${matchedSymptoms.join(', ')}\n\nComponents to check: ${componentList}\n\n${checklist}`,
      metadata: JSON.stringify({
        symptoms: matchedSymptoms,
        components: Array.from(allComponents),
        steps: allSteps,
      }),
    },
  ];
}

async function handleManualQuery(
  sessionId: string,
  database: typeof db
): Promise<ResponseMessage[]> {
  const [session] = await database
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session?.equipmentModelId) {
    return [
      {
        role: 'system',
        messageType: 'text',
        content:
          'I need to know what equipment you are working on to find manuals. Please provide the model number.',
        metadata: JSON.stringify({ needsEquipmentContext: true }),
      },
    ];
  }

  const equipmentManuals = await database
    .select({
      id: manuals.id,
      title: manuals.title,
      manualType: manuals.manualType,
      sourceRef: manuals.sourceRef,
    })
    .from(manuals)
    .where(eq(manuals.modelId, session.equipmentModelId));

  if (equipmentManuals.length === 0) {
    return [
      {
        role: 'system',
        messageType: 'text',
        content: 'No manuals found for this equipment model in the database.',
        metadata: JSON.stringify({ manuals: [] }),
      },
    ];
  }

  // Get current revision for each manual
  const manualsWithRevisions = await Promise.all(
    equipmentManuals.map(async (manual) => {
      const [currentRevision] = await database
        .select()
        .from(manualRevisions)
        .where(and(eq(manualRevisions.manualId, manual.id), eq(manualRevisions.isCurrent, true)))
        .limit(1);

      return { ...manual, currentRevision: currentRevision || null };
    })
  );

  const manualList = manualsWithRevisions
    .map((m) => {
      let line = `${m.manualType.toUpperCase()}: ${m.title}`;
      if (m.currentRevision) {
        line += ` (Rev ${m.currentRevision.revisionCode}, ${m.currentRevision.publicationDate})`;
      }
      if (m.sourceRef) {
        line += ` — Ref: ${m.sourceRef}`;
      }
      return line;
    })
    .join('\n');

  return [
    {
      role: 'system',
      messageType: 'text',
      content: `Available manuals for this equipment:\n${manualList}`,
      metadata: JSON.stringify({ manuals: manualsWithRevisions }),
    },
  ];
}

async function handleSupplierQuery(
  sessionId: string,
  database: typeof db
): Promise<ResponseMessage[]> {
  const [session] = await database
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session?.equipmentModelId) {
    return [
      {
        role: 'system',
        messageType: 'text',
        content:
          'I need to know what equipment you are working on to check supplier availability. Please provide the model number.',
        metadata: JSON.stringify({ needsEquipmentContext: true }),
      },
    ];
  }

  // Get all parts for this model and their supplier inventory
  const inventoryResults = await database
    .select({
      partNumber: parts.partNumber,
      partDescription: parts.description,
      partCategory: parts.category,
      supplierName: suppliers.name,
      supplierType: suppliers.type,
      city: suppliers.city,
      state: suppliers.state,
      phone: suppliers.phone,
      stockQuantity: supplierInventory.stockQuantity,
      priceCents: supplierInventory.priceCents,
      leadTimeDays: supplierInventory.leadTimeDays,
      lastCheckedAt: supplierInventory.lastCheckedAt,
    })
    .from(modelParts)
    .innerJoin(parts, eq(modelParts.partId, parts.id))
    .innerJoin(supplierInventory, eq(parts.id, supplierInventory.partId))
    .innerJoin(suppliers, eq(supplierInventory.supplierId, suppliers.id))
    .where(eq(modelParts.modelId, session.equipmentModelId))
    .orderBy(desc(supplierInventory.stockQuantity));

  if (inventoryResults.length === 0) {
    return [
      {
        role: 'system',
        messageType: 'parts_info',
        content: 'No supplier inventory data found for parts associated with this equipment.',
        metadata: JSON.stringify({ inventory: [] }),
      },
    ];
  }

  const summaryLines = inventoryResults.map((inv) => {
    const price = inv.priceCents ? `$${(inv.priceCents / 100).toFixed(2)}` : 'call';
    const stock = inv.stockQuantity ?? 0;
    return `${inv.partNumber} (${inv.partDescription}) — ${inv.supplierName} (${inv.city}, ${inv.state}): ${stock} in stock, ${price}`;
  });

  return [
    {
      role: 'system',
      messageType: 'parts_info',
      content: `Supplier availability for equipment parts:\n${summaryLines.join('\n')}`,
      metadata: JSON.stringify({ inventory: inventoryResults }),
    },
  ];
}

async function handleGenerateReport(
  sessionId: string,
  database: typeof db
): Promise<ResponseMessage[]> {
  const [session] = await database
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    return [
      {
        role: 'system',
        messageType: 'text',
        content: 'Session not found.',
        metadata: JSON.stringify({ error: true }),
      },
    ];
  }

  // Gather all session messages
  const messages = await database
    .select()
    .from(sessionMessages)
    .where(eq(sessionMessages.sessionId, sessionId))
    .orderBy(asc(sessionMessages.createdAt));

  // Extract structured data from messages
  let equipmentInfo = null;
  const diagnosticSteps: string[] = [];
  const partsDiscussed: string[] = [];
  const bulletinsReviewed: string[] = [];

  for (const msg of messages) {
    if (msg.metadata) {
      try {
        const meta = JSON.parse(msg.metadata);

        if (msg.messageType === 'equipment_identified' && meta.equipment) {
          equipmentInfo = meta.equipment;
        }
        if (msg.messageType === 'suggestion' && meta.steps) {
          diagnosticSteps.push(...meta.steps);
        }
        if (msg.messageType === 'parts_info' && meta.parts) {
          for (const p of meta.parts) {
            partsDiscussed.push(p.partNumber || p.partDescription);
          }
        }
        if (msg.messageType === 'bulletin_alert' && meta.bulletins) {
          for (const b of meta.bulletins) {
            bulletinsReviewed.push(b.bulletinNumber || b.title);
          }
        }
      } catch {
        // Skip unparseable metadata
      }
    }
  }

  // Get equipment details if we have a model
  let modelInfo = null;
  if (session.equipmentModelId) {
    const [model] = await database
      .select({
        modelNumber: models.modelNumber,
        description: models.description,
        manufacturer: manufacturers.name,
        productLine: productLines.name,
      })
      .from(models)
      .innerJoin(productLines, eq(models.productLineId, productLines.id))
      .innerJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
      .where(eq(models.id, session.equipmentModelId))
      .limit(1);
    modelInfo = model || null;
  }

  // Detect missing report-critical fields
  const allUserText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const missingFields: string[] = [];
  if (!session.serialNumber && !/serial|s\/n|\bsn\b/.test(allUserText)) {
    missingFields.push('serial number');
  }
  const hasRootCause = /capacitor|contactor|fan motor|refrigerant|leak|control board|sensor|defrost|airflow/i.test(allUserText);
  if (!hasRootCause) {
    missingFields.push('root cause (e.g. capacitor failure, refrigerant leak)');
  }
  const hasArrivalInfo = /running|not running|not working|won.?t start|operating|no power/i.test(allUserText);
  if (!hasArrivalInfo) {
    missingFields.push('whether the system was running on arrival');
  }

  const reportFields = {
    sessionId,
    technicianName: session.technicianName,
    customerName: session.customerName,
    siteAddress: session.siteAddress,
    equipment: modelInfo
      ? `${modelInfo.manufacturer} ${modelInfo.productLine} ${modelInfo.modelNumber}`
      : 'Not identified',
    serialNumber: session.serialNumber || 'Not recorded',
    diagnosticSteps,
    partsDiscussed,
    bulletinsReviewed,
    sessionMessageCount: messages.length,
    sessionStarted: session.createdAt,
    missingFields,
  };

  const responses: ResponseMessage[] = [];

  // Ask for missing info conversationally
  if (missingFields.length > 0) {
    const itemList = missingFields.length === 1
      ? missingFields[0]
      : missingFields.slice(0, -1).join(', ') + ' and ' + missingFields[missingFields.length - 1];
    responses.push({
      role: 'system',
      messageType: 'text',
      content: `Almost done. A few things I still need for the report: ${itemList}. What are they? (Or tap Review & Submit below to fill them in manually.)`,
      metadata: JSON.stringify({ collectingReportInfo: true, missingFields }),
    });
  }

  responses.push({
    role: 'system',
    messageType: 'report_generated',
    content: missingFields.length > 0
      ? `Report draft ready for ${reportFields.equipment}. ${missingFields.length} field(s) highlighted need your input.`
      : `Report draft ready for ${reportFields.equipment}. Review the pre-filled fields before submitting.`,
    metadata: JSON.stringify(reportFields),
  });

  return responses;
}

function handleUnknown(): ResponseMessage[] {
  return [
    {
      role: 'system',
      messageType: 'text',
      content:
        "I can help you with the following — just ask or describe what you need:",
      metadata: JSON.stringify({
        suggestions: [
          'Identify equipment (provide model number)',
          'Look up parts for this unit',
          'Check bulletins and recalls',
          'Diagnose a symptom (e.g., not cooling, short cycling)',
          'Find manuals and wiring diagrams',
          'Check supplier availability and pricing',
          'Generate a service report',
        ],
      }),
    },
  ];
}

// ── Main Entry Point ─────────────────────────────────────────

export async function processMessage(
  sessionId: string,
  userMessage: string,
  database: typeof db = db
): Promise<ResponseMessage[]> {
  const intent = detectIntent(userMessage);

  switch (intent) {
    case 'equipment_id':
      return handleEquipmentId(userMessage, sessionId, database);
    case 'parts_query':
      return handlePartsQuery(userMessage, sessionId, database);
    case 'bulletin_query':
      return handleBulletinQuery(sessionId, database);
    case 'diagnostic':
      return handleDiagnostic(userMessage);
    case 'manual_query':
      return handleManualQuery(sessionId, database);
    case 'supplier_query':
      return handleSupplierQuery(sessionId, database);
    case 'generate_report':
      return handleGenerateReport(sessionId, database);
    default:
      return handleUnknown();
  }
}
