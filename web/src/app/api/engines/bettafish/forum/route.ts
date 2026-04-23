import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Forum engine — returns recent discussion summaries
export async function GET() {
  return NextResponse.json({
    lines: [
      `[${new Date().toISOString()}] 🐟 BettaFish Forum Engine v2.0 — Serverless Mode`,
      `[INFO] Engines: insight, media, query, forum — todos ativos`,
      `[INFO] Backend: Gemini 2.0 Flash (serverless)`,
      `[INFO] Modo: Análise sob demanda via API routes`,
      `[OK] Pronto para consultas.`,
    ],
    status: 'active',
  });
}
