import { NextResponse } from 'next/server';

const MIROFISH_BACKEND = 'https://mirofish-api.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, context } = body;

    // Create a simulation project first
    const createRes = await fetch(`${MIROFISH_BACKEND}/api/simulation/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: topic, description: context || topic }),
      signal: AbortSignal.timeout(15000),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return NextResponse.json({ result: `Erro ao criar simulação: ${JSON.stringify(err)}` });
    }

    const project = await createRes.json();

    // Try to prepare/run simulation
    const prepRes = await fetch(`${MIROFISH_BACKEND}/api/simulation/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id || project.project_id, topic, context }),
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);

    const prepData = prepRes?.ok ? await prepRes.json().catch(() => null) : null;

    return NextResponse.json({
      result: prepData
        ? JSON.stringify(prepData, null, 2)
        : `Projeto criado: ${JSON.stringify(project, null, 2)}\n\nSimulação em preparação...`,
      project,
    });
  } catch (e) {
    return NextResponse.json({
      result: `Erro: ${e instanceof Error ? e.message : 'Falha na conexão'}`,
    });
  }
}
