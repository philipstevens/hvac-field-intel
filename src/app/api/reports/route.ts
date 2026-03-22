import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { serviceReports } from '@/db/schema';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const report = {
      id,
      technicianName: body.technicianName,
      modelId: body.modelId || null,
      serialNumber: body.serialNumber || null,
      status: body.status || 'draft',
      arrivalCondition: body.arrivalCondition || null,
      diagnosis: body.diagnosis || null,
      workPerformed: body.workPerformed || null,
      measurementsPost: body.measurementsPost || null,
      technicianNotes: body.technicianNotes || null,
      createdAt: now,
      submittedAt: body.status === 'submitted' ? now : null,
    };

    await db.insert(serviceReports).values(report);

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Failed to create report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}
