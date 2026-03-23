import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sessionMessages, analyticsEvents } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { processMessage } from '@/lib/session-engine';
import crypto from 'crypto';

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

    if (session.isDemo) {
      return NextResponse.json(
        { error: 'Demo sessions are read-only' },
        { status: 403 }
      );
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'content is required and must be a string' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Insert user message
    const userMessage = {
      id: crypto.randomUUID(),
      sessionId: id,
      role: 'user',
      messageType: 'text',
      content: body.content,
      metadata: null,
      createdAt: now,
    };

    await db.insert(sessionMessages).values(userMessage);

    // Process through session engine
    const responseMessages = await processMessage(id, body.content, db);

    // Insert all response messages
    const insertedResponses = [];
    for (const response of responseMessages) {
      const responseRecord = {
        id: crypto.randomUUID(),
        sessionId: id,
        role: response.role,
        messageType: response.messageType,
        content: response.content,
        metadata: response.metadata,
        createdAt: new Date().toISOString(),
      };

      await db.insert(sessionMessages).values(responseRecord);
      insertedResponses.push(responseRecord);
    }

    // Write analytics events for key message types
    const analyticsToInsert = insertedResponses
      .filter((r) => ['equipment_identified', 'bulletin_alert', 'report_generated'].includes(r.messageType))
      .map((r) => ({
        id: crypto.randomUUID(),
        eventType: r.messageType,
        metadata: JSON.stringify({ sessionId: id, messageId: r.id }),
        createdAt: now,
      }));
    if (analyticsToInsert.length > 0) {
      await db.insert(analyticsEvents).values(analyticsToInsert);
    }

    return NextResponse.json({
      userMessage,
      responses: insertedResponses,
    });
  } catch (error) {
    console.error('Failed to process message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
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

    const messages = await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, id))
      .orderBy(asc(sessionMessages.createdAt));

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to get messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}
