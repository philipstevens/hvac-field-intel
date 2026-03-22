'use client';

import { ArrowDown } from 'lucide-react';
import clsx from 'clsx';

export type ChainNode = {
  id: string;
  partNumber: string;
  description: string | null;
  date: string | null;
  installationNotes: string | null;
  isCurrent: boolean;
};

export function SupersessionChain({ chain }: { chain: ChainNode[] }) {
  if (chain.length <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-0">
      {chain.map((node, idx) => (
        <div key={node.id} className="flex flex-col items-center w-full max-w-sm">
          {/* Node */}
          <a
            href={`/parts/${node.id}`}
            className={clsx(
              'w-full rounded-lg border-2 px-4 py-3 text-center transition-colors',
              node.isCurrent
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-300 bg-gray-50'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className={clsx(
                  'font-mono text-lg font-bold',
                  node.isCurrent ? 'text-green-800' : 'text-gray-600'
                )}
              >
                {node.partNumber}
              </span>
              {node.isCurrent && (
                <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                  CURRENT
                </span>
              )}
            </div>
            {node.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                {node.description}
              </p>
            )}
            {node.date && (
              <p className="mt-0.5 text-xs text-gray-400">{node.date}</p>
            )}
          </a>

          {/* Arrow + installation notes between nodes */}
          {idx < chain.length - 1 && (
            <div className="flex flex-col items-center py-1">
              <ArrowDown className="h-5 w-5 text-gray-400" />
              {chain[idx + 1].installationNotes && (
                <p className="mt-1 max-w-xs rounded bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-800 border border-amber-200">
                  {chain[idx + 1].installationNotes}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
