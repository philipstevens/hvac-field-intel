import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { models, productLines, manufacturers } from '@/db/schema';
import { like, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const results = await db
    .select({
      id: models.id,
      modelNumber: models.modelNumber,
      description: models.description,
      manufacturer: manufacturers.name,
      productLine: productLines.name,
    })
    .from(models)
    .innerJoin(productLines, eq(models.productLineId, productLines.id))
    .innerJoin(manufacturers, eq(productLines.manufacturerId, manufacturers.id))
    .where(like(models.modelNumber, `%${q}%`))
    .limit(20);

  return NextResponse.json(results);
}
