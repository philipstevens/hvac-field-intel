import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sessionMessages, serviceReports, models, productLines, manufacturers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import crypto from 'crypto';

// ── Types ────────────────────────────────────────────────────

interface AutoFilledReport {
  equipment: {
    manufacturer: string;
    modelNumber: string;
    serialNumber: string;
    customerName: string;
    siteAddress: string;
  };
  arrivalCondition: {
    systemOperating: boolean | null;
    errorCodes: string;
    ambientTemp: number | null;
    initialSymptoms: string;
  };
  diagnosis: {
    rootCause: string;
    contributingFactors: string[];
    diagnosisNotes: string;
    applicableBulletins: { bulletinNumber: string; title: string }[];
  };
  workPerformed: {
    partsReplaced: {
      partNumber: string;
      description: string;
      position: string;
      action: string;
    }[];
    workDescription: string;
  };
  measurements: {
    supplyTemp: number | null;
    returnTemp: number | null;
    suctionPsi: number | null;
    dischargePsi: number | null;
    superheat: number | null;
    subcooling: number | null;
  };
  technicianNotes: string;
  aiSuggestion: string;
}

interface FieldStatus {
  field: string;
  status: 'filled' | 'review' | 'missing';
  source?: string;
}

// ── Extraction helpers ───────────────────────────────────────

const ROOT_CAUSE_KEYWORDS: Record<string, string[]> = {
  capacitor_failure: ['capacitor', 'cap', 'capacitors', 'bulging cap', 'swollen cap', 'cap failed'],
  fan_motor_failure: ['fan motor', 'blower motor', 'condenser fan', 'motor seized', 'motor failed'],
  contactor_failure: ['contactor', 'contactor pitted', 'contactor stuck', 'contactor burned'],
  refrigerant_leak: ['leak', 'refrigerant', 'low charge', 'low refrigerant', 'freon'],
  control_board_failure: ['control board', 'board', 'pcb', 'circuit board', 'defrost board'],
  sensor_failure: ['sensor', 'thermistor', 'thermostat', 'temp sensor'],
  defrost_issue: ['defrost', 'ice', 'frozen', 'icing', 'frost'],
  airflow_restriction: ['airflow', 'filter', 'ductwork', 'restricted', 'blocked', 'dirty filter'],
};

const CONTRIBUTING_FACTOR_KEYWORDS: Record<string, string[]> = {
  age: ['old', 'aged', 'years old', 'original', 'aging'],
  high_ambient: ['hot day', 'high ambient', 'extreme heat', '100 degrees', '110 degrees'],
  power_surge: ['power surge', 'lightning', 'power outage', 'electrical surge'],
  lack_maintenance: ['no maintenance', 'never serviced', 'dirty', 'neglected', 'clogged'],
  manufacturing_defect: ['defect', 'factory', 'manufacturer recall', 'known issue'],
  normal_wear: ['wear', 'worn', 'normal wear', 'expected life', 'end of life'],
};

const PART_ACTION_KEYWORDS: Record<string, string[]> = {
  replaced: ['replaced', 'swapped', 'installed', 'put in', 'changed out', 'new'],
  cleaned: ['cleaned', 'washed', 'flushed', 'cleared'],
  adjusted: ['adjusted', 'set', 'calibrated', 'tuned'],
  repaired: ['repaired', 'fixed', 'soldered', 'patched'],
};

function extractReportData(
  messages: typeof sessionMessages.$inferSelect[],
  sessionData: {
    manufacturer?: string | null;
    modelNumber?: string | null;
    serialNumber?: string | null;
    customerName?: string | null;
    siteAddress?: string | null;
  }
): { autoFilled: AutoFilledReport; missing: string[]; fieldStatuses: FieldStatus[]; confidence: number } {
  const userMessages = messages.filter((m) => m.role === 'user');
  const systemMessages = messages.filter((m) => m.role === 'system');
  const allUserText = userMessages.map((m) => m.content.toLowerCase()).join(' ');

  // ── Equipment ──
  let equipmentMeta: Record<string, string> = {};
  const equipmentMsg = systemMessages.find((m) => m.messageType === 'equipment_identified');
  if (equipmentMsg?.metadata) {
    try {
      equipmentMeta = JSON.parse(equipmentMsg.metadata);
    } catch {}
  }

  const equipment = {
    manufacturer: equipmentMeta.manufacturer || sessionData.manufacturer || '',
    modelNumber: equipmentMeta.modelNumber || sessionData.modelNumber || '',
    serialNumber: equipmentMeta.serialNumber || sessionData.serialNumber || '',
    customerName: sessionData.customerName || '',
    siteAddress: sessionData.siteAddress || '',
  };

  // ── Arrival Condition ──
  let systemOperating: boolean | null = null;
  if (/not running|not working|won'?t start|dead|no power|not operating|shut down|off/.test(allUserText)) {
    systemOperating = false;
  } else if (/running|operating|turning on|works|powered on|cycling/.test(allUserText)) {
    systemOperating = true;
  }

  const errorCodeMatch = allUserText.match(/(?:error|fault|code|e\d)\s*(?:code\s*)?[:\s]?\s*([A-Z0-9-]{2,10})/i);
  const errorCodes = errorCodeMatch ? errorCodeMatch[1].toUpperCase() : '';

  const ambientTempMatch = allUserText.match(/(?:ambient|outside|outdoor)\s*(?:temp(?:erature)?)?\s*(?:is|was|at|of)?\s*(\d{2,3})\s*(?:degrees|°?f?)/i);
  const ambientTemp = ambientTempMatch ? parseInt(ambientTempMatch[1]) : null;

  // Initial symptoms from user messages before first suggestion
  const firstSuggestionIdx = messages.findIndex((m) => m.messageType === 'suggestion');
  const symptomMessages = firstSuggestionIdx > 0
    ? userMessages.filter((m) => m.createdAt < messages[firstSuggestionIdx].createdAt)
    : userMessages.slice(0, 3);
  const initialSymptoms = symptomMessages
    .map((m) => m.content)
    .filter((c) => c.length > 10)
    .join('. ');

  // ── Diagnosis ──
  let rootCause = '';
  for (const [cause, keywords] of Object.entries(ROOT_CAUSE_KEYWORDS)) {
    if (keywords.some((kw) => allUserText.includes(kw))) {
      rootCause = cause;
      break;
    }
  }

  const contributingFactors: string[] = [];
  for (const [factor, keywords] of Object.entries(CONTRIBUTING_FACTOR_KEYWORDS)) {
    if (keywords.some((kw) => allUserText.includes(kw))) {
      contributingFactors.push(factor);
    }
  }

  // Diagnosis notes from suggestion messages
  const suggestionMessages = systemMessages.filter((m) => m.messageType === 'suggestion');
  const diagnosisNotes = suggestionMessages.map((m) => m.content).join('\n\n');

  // Bulletins
  const bulletinMessages = systemMessages.filter((m) => m.messageType === 'bulletin_alert');
  const applicableBulletins: { bulletinNumber: string; title: string }[] = [];
  for (const bm of bulletinMessages) {
    if (bm.metadata) {
      try {
        const meta = JSON.parse(bm.metadata);
        if (Array.isArray(meta)) {
          meta.forEach((b: { bulletinNumber?: string; title?: string }) => {
            if (b.bulletinNumber) applicableBulletins.push({ bulletinNumber: b.bulletinNumber, title: b.title || '' });
          });
        } else if (meta.bulletinNumber) {
          applicableBulletins.push({ bulletinNumber: meta.bulletinNumber, title: meta.title || '' });
        }
      } catch {}
    }
  }

  // ── Work Performed ──
  const partsReplaced: { partNumber: string; description: string; position: string; action: string }[] = [];
  for (const msg of userMessages) {
    const lower = msg.content.toLowerCase();
    let detectedAction = '';
    for (const [action, keywords] of Object.entries(PART_ACTION_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        detectedAction = action;
        break;
      }
    }
    if (detectedAction) {
      // Try to extract part numbers (patterns like CPT-0575, HC39GE237, etc.)
      const partNumbers = msg.content.match(/[A-Z]{2,4}[-]?\d{3,}[A-Z]?\d*/gi) || [];
      if (partNumbers.length > 0) {
        for (const pn of partNumbers) {
          partsReplaced.push({
            partNumber: pn.toUpperCase(),
            description: '',
            position: '',
            action: detectedAction,
          });
        }
      } else {
        // No specific part number; use the message as description
        partsReplaced.push({
          partNumber: '',
          description: msg.content.substring(0, 120),
          position: '',
          action: detectedAction,
        });
      }
    }
  }

  // Parts info from system messages
  const partsInfoMessages = systemMessages.filter((m) => m.messageType === 'parts_info');
  const workDescParts: string[] = [];
  if (partsReplaced.length > 0) {
    workDescParts.push(
      partsReplaced.map((p) => `${p.action} ${p.partNumber || p.description}`.trim()).join('; ')
    );
  }
  if (partsInfoMessages.length > 0) {
    workDescParts.push(...partsInfoMessages.map((m) => m.content));
  }

  // ── Measurements ──
  const measurementMessages = systemMessages.filter((m) => m.messageType === 'measurement');
  const measurementText = [...measurementMessages.map((m) => m.content), ...userMessages.map((m) => m.content)].join(' ');

  const extractNumber = (patterns: RegExp[]): number | null => {
    for (const pat of patterns) {
      const match = measurementText.match(pat);
      if (match) return parseFloat(match[1]);
    }
    return null;
  };

  const supplyTemp = extractNumber([
    /supply\s*(?:temp(?:erature)?)?\s*(?:is|was|at|of|:)?\s*(\d+\.?\d*)\s*(?:°?f|degrees)/i,
    /(\d+\.?\d*)\s*(?:°?f|degrees)\s*supply/i,
  ]);
  const returnTemp = extractNumber([
    /return\s*(?:temp(?:erature)?)?\s*(?:is|was|at|of|:)?\s*(\d+\.?\d*)\s*(?:°?f|degrees)/i,
    /(\d+\.?\d*)\s*(?:°?f|degrees)\s*return/i,
  ]);
  const suctionPsi = extractNumber([
    /suction\s*(?:pressure)?\s*(?:is|was|at|of|:)?\s*(\d+\.?\d*)\s*(?:psi)/i,
    /(\d+\.?\d*)\s*psi\s*suction/i,
  ]);
  const dischargePsi = extractNumber([
    /discharge\s*(?:pressure)?\s*(?:is|was|at|of|:)?\s*(\d+\.?\d*)\s*(?:psi)/i,
    /(?:head|high\s*side)\s*(?:pressure)?\s*(?:is|was|at|of|:)?\s*(\d+\.?\d*)\s*(?:psi)/i,
  ]);
  const superheat = extractNumber([
    /superheat\s*(?:is|was|at|of|:)?\s*(\d+\.?\d*)\s*(?:°?f|degrees)?/i,
  ]);
  const subcooling = extractNumber([
    /sub\s*cool(?:ing)?\s*(?:is|was|at|of|:)?\s*(\d+\.?\d*)\s*(?:°?f|degrees)?/i,
  ]);

  // ── Technician Notes ──
  // Collect remaining user messages not captured elsewhere
  const laterUserMessages = firstSuggestionIdx > 0
    ? userMessages.filter((m) => m.createdAt >= messages[firstSuggestionIdx].createdAt)
    : userMessages.slice(3);
  const notesText = laterUserMessages
    .filter((m) => {
      const lower = m.content.toLowerCase();
      // Exclude messages already captured as part replacements or simple commands
      const isPartAction = Object.values(PART_ACTION_KEYWORDS).flat().some((kw) => lower.includes(kw));
      const isCommand = /^(generate report|check|what|any|show|list)\b/i.test(lower);
      return !isPartAction && !isCommand && m.content.length > 15;
    })
    .map((m) => m.content)
    .join('\n');

  // ── AI Suggestion ──
  let aiSuggestion = '';
  if (applicableBulletins.length > 0) {
    aiSuggestion = `Consider referencing ${applicableBulletins.map((b) => b.bulletinNumber).join(', ')} in your report for warranty documentation.`;
  }
  if (!rootCause && diagnosisNotes) {
    aiSuggestion += aiSuggestion ? ' ' : '';
    aiSuggestion += 'A root cause diagnosis is recommended for complete documentation.';
  }

  const autoFilled: AutoFilledReport = {
    equipment,
    arrivalCondition: {
      systemOperating,
      errorCodes,
      ambientTemp,
      initialSymptoms,
    },
    diagnosis: {
      rootCause,
      contributingFactors,
      diagnosisNotes,
      applicableBulletins,
    },
    workPerformed: {
      partsReplaced,
      workDescription: workDescParts.join('\n'),
    },
    measurements: {
      supplyTemp,
      returnTemp,
      suctionPsi,
      dischargePsi,
      superheat,
      subcooling,
    },
    technicianNotes: notesText,
    aiSuggestion,
  };

  // ── Field statuses ──
  const fieldStatuses: FieldStatus[] = [];
  const missing: string[] = [];

  const addStatus = (field: string, value: unknown, source?: string) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      fieldStatuses.push({ field, status: 'missing' });
      missing.push(field);
    } else if (source === 'inferred') {
      fieldStatuses.push({ field, status: 'review', source });
    } else {
      fieldStatuses.push({ field, status: 'filled', source });
    }
  };

  addStatus('manufacturer', equipment.manufacturer, 'session');
  addStatus('modelNumber', equipment.modelNumber, 'session');
  addStatus('serialNumber', equipment.serialNumber, 'session');
  addStatus('customerName', equipment.customerName, 'session');
  addStatus('siteAddress', equipment.siteAddress, 'session');
  addStatus('systemOperating', systemOperating, systemOperating !== null ? 'inferred' : undefined);
  addStatus('errorCodes', errorCodes, errorCodes ? 'inferred' : undefined);
  addStatus('ambientTemp', ambientTemp, ambientTemp ? 'inferred' : undefined);
  addStatus('initialSymptoms', initialSymptoms, initialSymptoms ? 'conversation' : undefined);
  addStatus('rootCause', rootCause, rootCause ? 'inferred' : undefined);
  addStatus('diagnosisNotes', diagnosisNotes, diagnosisNotes ? 'conversation' : undefined);
  addStatus('partsReplaced', partsReplaced.length > 0 ? partsReplaced : null, 'inferred');
  addStatus('workDescription', workDescParts.join(''), workDescParts.length > 0 ? 'inferred' : undefined);
  addStatus('supplyTemp', supplyTemp, supplyTemp ? 'inferred' : undefined);
  addStatus('returnTemp', returnTemp, returnTemp ? 'inferred' : undefined);
  addStatus('suctionPsi', suctionPsi, suctionPsi ? 'inferred' : undefined);
  addStatus('dischargePsi', dischargePsi, dischargePsi ? 'inferred' : undefined);
  addStatus('superheat', superheat, superheat ? 'inferred' : undefined);
  addStatus('subcooling', subcooling, subcooling ? 'inferred' : undefined);

  // Confidence: ratio of filled + review fields to total
  const filledCount = fieldStatuses.filter((f) => f.status !== 'missing').length;
  const confidence = Math.round((filledCount / fieldStatuses.length) * 100);

  return { autoFilled, missing, fieldStatuses, confidence };
}

// ── GET handler ──────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get session with equipment details via direct DB query
    const [sessionWithEquipment] = await db
      .select({
        id: sessions.id,
        technicianName: sessions.technicianName,
        serialNumber: sessions.serialNumber,
        customerName: sessions.customerName,
        siteAddress: sessions.siteAddress,
        modelNumber: models.modelNumber,
        manufacturer: manufacturers.name,
      })
      .from(sessions)
      .leftJoin(models, eq(sessions.equipmentModelId, models.id))
      .leftJoin(productLines, eq(models.productLineId, productLines.id))
      .leftJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
      .where(eq(sessions.id, id))
      .limit(1);

    const sessionData = sessionWithEquipment || {};

    const messages = await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, id))
      .orderBy(asc(sessionMessages.createdAt));

    const result = extractReportData(messages, sessionData as {
      manufacturer?: string | null;
      modelNumber?: string | null;
      serialNumber?: string | null;
      customerName?: string | null;
      siteAddress?: string | null;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to extract report data:', error);
    return NextResponse.json(
      { error: 'Failed to extract report data' },
      { status: 500 }
    );
  }
}

// ── POST handler ─────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify session exists
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();
    const now = new Date().toISOString();
    const reportId = crypto.randomUUID();

    // Determine status based on body.draft flag
    const isDraft = body.draft === true;
    const reportStatus = isDraft ? 'draft' : 'submitted';

    // Create service report
    const report = {
      id: reportId,
      technicianName: session.technicianName,
      modelId: session.equipmentModelId,
      serialNumber: body.equipment?.serialNumber || session.serialNumber || null,
      status: reportStatus,
      arrivalCondition: JSON.stringify(body.arrivalCondition || {}),
      diagnosis: JSON.stringify(body.diagnosis || {}),
      workPerformed: JSON.stringify(body.workPerformed || {}),
      measurementsPost: JSON.stringify(body.measurements || {}),
      technicianNotes: body.technicianNotes || null,
      createdAt: now,
      submittedAt: isDraft ? null : now,
    };

    await db.insert(serviceReports).values(report);

    // Update session
    const sessionUpdate: Record<string, unknown> = {
      reportId,
    };

    if (!isDraft) {
      sessionUpdate.status = 'completed';
      sessionUpdate.completedAt = now;
    }

    // Update serial number if provided
    if (body.equipment?.serialNumber) {
      sessionUpdate.serialNumber = body.equipment.serialNumber;
    }

    await db.update(sessions).set(sessionUpdate).where(eq(sessions.id, id));

    // Add closing message if not draft
    if (!isDraft) {
      await db.insert(sessionMessages).values({
        id: crypto.randomUUID(),
        sessionId: id,
        role: 'system',
        messageType: 'text',
        content: 'Service report submitted. Session closed.',
        metadata: JSON.stringify({ reportId }),
        createdAt: now,
      });
    }

    // Return updated session
    const [updatedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    return NextResponse.json({ report, session: updatedSession }, { status: 201 });
  } catch (error) {
    console.error('Failed to create report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}
