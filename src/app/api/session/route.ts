import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sessionMessages, analyticsEvents, models, productLines, manufacturers } from '@/db/schema';
import { eq, desc, like, and, ne, or, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.technicianName) {
      return NextResponse.json(
        { error: 'technicianName is required' },
        { status: 400 }
      );
    }

    const visitorId = request.cookies.get('visitor_id')?.value ?? crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    const session = {
      id: sessionId,
      technicianName: body.technicianName,
      status: 'active' as const,
      equipmentModelId: null,
      serialNumber: null,
      siteAddress: body.siteAddress || null,
      customerName: body.customerName || null,
      reportId: null,
      createdAt: now,
      completedAt: null,
      isDemo: false,
      visitorId,
    };

    await db.insert(sessions).values(session);

    await db.insert(analyticsEvents).values({
      id: crypto.randomUUID(),
      eventType: 'session_created',
      metadata: JSON.stringify({ sessionId, technicianName: body.technicianName, hasCustomer: !!body.customerName }),
      createdAt: now,
    });

    const message = {
      id: messageId,
      sessionId,
      role: 'system',
      messageType: 'text',
      content: 'Session started. What equipment are you working on today?',
      metadata: null as string | null,
      createdAt: now,
    };

    await db.insert(sessionMessages).values(message);

    const messages = [message];

    // Check for prior customer history
    if (body.customerName) {
      const priorSessions = await db
        .select({
          id: sessions.id,
          technicianName: sessions.technicianName,
          customerName: sessions.customerName,
          createdAt: sessions.createdAt,
          status: sessions.status,
        })
        .from(sessions)
        .where(
          and(
            ne(sessions.id, sessionId),
            like(sessions.customerName, `%${body.customerName}%`)
          )
        )
        .orderBy(desc(sessions.createdAt))
        .limit(5);

      if (priorSessions.length > 0) {
        const latest = priorSessions[0];
        const dateStr = new Date(latest.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        // Get a brief summary from the latest prior session's messages
        const priorMessages = await db
          .select({
            messageType: sessionMessages.messageType,
            content: sessionMessages.content,
          })
          .from(sessionMessages)
          .where(eq(sessionMessages.sessionId, latest.id))
          .limit(5);

        const summaryParts: string[] = [];
        for (const pm of priorMessages) {
          if (pm.messageType === 'equipment_identified') {
            summaryParts.push(pm.content);
          }
        }
        const briefSummary = summaryParts.length > 0
          ? summaryParts[0]
          : `session status: ${latest.status}`;

        const historyMessageId = crypto.randomUUID();
        const historyMessage = {
          id: historyMessageId,
          sessionId,
          role: 'system',
          messageType: 'text',
          content: `Welcome back! I see ${body.customerName} has been serviced before. Previous visit on ${dateStr} — ${briefSummary}. This history will be available throughout the session.`,
          metadata: JSON.stringify({
            priorSessionIds: priorSessions.map((s) => s.id),
            priorSessions: priorSessions.map((s) => ({
              id: s.id,
              date: s.createdAt,
              technician: s.technicianName,
              status: s.status,
            })),
          }),
          createdAt: now,
        };

        await db.insert(sessionMessages).values(historyMessage);
        messages.push(historyMessage);
      }
    }

    return NextResponse.json({ session, messages }, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const visitorId = request.cookies.get('visitor_id')?.value;

    const allSessions = await db
      .select({
        id: sessions.id,
        technicianName: sessions.technicianName,
        status: sessions.status,
        equipmentModelId: sessions.equipmentModelId,
        serialNumber: sessions.serialNumber,
        siteAddress: sessions.siteAddress,
        customerName: sessions.customerName,
        createdAt: sessions.createdAt,
        completedAt: sessions.completedAt,
        isDemo: sessions.isDemo,
        modelNumber: models.modelNumber,
        modelDescription: models.description,
        manufacturer: manufacturers.name,
        productLine: productLines.name,
        messageCount: sql<number>`(SELECT COUNT(*) FROM session_messages WHERE session_id = ${sessions.id})`,
      })
      .from(sessions)
      .leftJoin(models, eq(sessions.equipmentModelId, models.id))
      .leftJoin(productLines, eq(models.productLineId, productLines.id))
      .leftJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
      .where(
        or(
          eq(sessions.isDemo, true),
          visitorId ? eq(sessions.visitorId, visitorId) : isNull(sessions.visitorId)
        )
      )
      .orderBy(desc(sessions.createdAt));

    return NextResponse.json(allSessions);
  } catch (error) {
    console.error('Failed to list sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}
