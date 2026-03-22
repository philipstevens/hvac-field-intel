import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  sessions,
  models,
  productLines,
  manufacturers,
  bulletins,
  bulletinApplicability,
  parts,
  modelParts,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get session with equipment info
    const [session] = await db
      .select({
        id: sessions.id,
        technicianName: sessions.technicianName,
        status: sessions.status,
        equipmentModelId: sessions.equipmentModelId,
        serialNumber: sessions.serialNumber,
        siteAddress: sessions.siteAddress,
        customerName: sessions.customerName,
        reportId: sessions.reportId,
        createdAt: sessions.createdAt,
        completedAt: sessions.completedAt,
        isDemo: sessions.isDemo,
        modelNumber: models.modelNumber,
        modelDescription: models.description,
        refrigerantType: models.refrigerantType,
        voltage: models.voltage,
        btuRating: models.btuRating,
        seerRating: models.seerRating,
        productLine: productLines.name,
        productLineCategory: productLines.category,
        manufacturer: manufacturers.name,
      })
      .from(sessions)
      .leftJoin(models, eq(sessions.equipmentModelId, models.id))
      .leftJoin(productLines, eq(models.productLineId, productLines.id))
      .leftJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get applicable bulletins if equipment is identified
    let applicableBulletins: any[] = [];
    if (session.equipmentModelId) {
      applicableBulletins = await db
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
          and(
            eq(bulletinApplicability.modelId, session.equipmentModelId),
            eq(bulletins.status, 'active')
          )
        );
    }

    // Get parts list if equipment is identified
    let partsList: any[] = [];
    if (session.equipmentModelId) {
      partsList = await db
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
    }

    return NextResponse.json({
      session,
      bulletins: applicableBulletins,
      parts: partsList,
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify session exists
    const [existing] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing.isDemo) {
      return NextResponse.json({ error: 'Demo sessions are read-only' }, { status: 403 });
    }

    const body = await request.json();

    // Build update object from allowed fields
    const updateData: Record<string, any> = {};

    if (body.equipmentModelId !== undefined) {
      updateData.equipmentModelId = body.equipmentModelId;
    }
    if (body.serialNumber !== undefined) {
      updateData.serialNumber = body.serialNumber;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed' && existing.status !== 'completed') {
        updateData.completedAt = new Date().toISOString();
      }
    }
    if (body.customerName !== undefined) {
      updateData.customerName = body.customerName;
    }
    if (body.siteAddress !== undefined) {
      updateData.siteAddress = body.siteAddress;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    await db.update(sessions).set(updateData).where(eq(sessions.id, id));

    // Return updated session
    const [updated] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
