import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parts, partSupersessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface ChainEntry {
  id: string;
  partNumber: string;
  description: string;
  status: string | null;
  supersessionDate: string | null;
  installationNotes: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get the starting part
  const [startPart] = await db
    .select()
    .from(parts)
    .where(eq(parts.id, id))
    .limit(1);

  if (!startPart) {
    return NextResponse.json({ error: 'Part not found' }, { status: 404 });
  }

  const visited = new Set<string>();
  const chain: ChainEntry[] = [];

  // Walk backwards to find the oldest ancestor
  let currentId = id;
  const backwardChain: ChainEntry[] = [];

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const [currentPart] = await db
      .select()
      .from(parts)
      .where(eq(parts.id, currentId))
      .limit(1);

    if (!currentPart) break;

    // Look for a predecessor (where this part is the new_part_id)
    const [predecessor] = await db
      .select({
        oldPartId: partSupersessions.oldPartId,
        supersessionDate: partSupersessions.supersessionDate,
        installationNotes: partSupersessions.installationNotes,
      })
      .from(partSupersessions)
      .where(eq(partSupersessions.newPartId, currentId))
      .limit(1);

    if (predecessor && !visited.has(predecessor.oldPartId)) {
      backwardChain.unshift({
        id: currentPart.id,
        partNumber: currentPart.partNumber,
        description: currentPart.description,
        status: currentPart.status,
        supersessionDate: predecessor.supersessionDate,
        installationNotes: predecessor.installationNotes,
      });
      currentId = predecessor.oldPartId;
    } else {
      // This is the oldest in the chain
      backwardChain.unshift({
        id: currentPart.id,
        partNumber: currentPart.partNumber,
        description: currentPart.description,
        status: currentPart.status,
        supersessionDate: null,
        installationNotes: null,
      });
      break;
    }
  }

  chain.push(...backwardChain);

  // Walk forward from the starting part to find successors
  visited.clear();
  for (const entry of chain) {
    visited.add(entry.id);
  }

  currentId = id;
  while (currentId) {
    const [successor] = await db
      .select({
        newPartId: partSupersessions.newPartId,
        supersessionDate: partSupersessions.supersessionDate,
        installationNotes: partSupersessions.installationNotes,
      })
      .from(partSupersessions)
      .where(eq(partSupersessions.oldPartId, currentId))
      .limit(1);

    if (!successor || visited.has(successor.newPartId)) break;

    visited.add(successor.newPartId);

    const [newPart] = await db
      .select()
      .from(parts)
      .where(eq(parts.id, successor.newPartId))
      .limit(1);

    if (!newPart) break;

    chain.push({
      id: newPart.id,
      partNumber: newPart.partNumber,
      description: newPart.description,
      status: newPart.status,
      supersessionDate: successor.supersessionDate,
      installationNotes: successor.installationNotes,
    });

    currentId = successor.newPartId;
  }

  return NextResponse.json({
    partId: id,
    chain,
  });
}
