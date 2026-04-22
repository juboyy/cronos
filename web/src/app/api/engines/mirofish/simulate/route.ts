import { NextResponse } from 'next/server';

const MIROFISH_BACKEND = 'https://mirofish-api.216-238-124-248.nip.io';
const DEFAULT_PROJECT_ID = 'proj_fa65318ca6ce';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, context, project_id } = body;

    const projectId = project_id || DEFAULT_PROJECT_ID;

    // Step 1: Get or verify project exists
    const projRes = await fetch(`${MIROFISH_BACKEND}/api/graph/project/${projectId}`, {
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    const projectExists = projRes?.ok;

    if (!projectExists) {
      return NextResponse.json({
        result: `Projeto ${projectId} não encontrado. Crie um projeto primeiro via a interface MiroFish.`,
        error: true,
      });
    }

    // Step 2: Try ontology generation with topic as input text
    const ontologyRes = await fetch(`${MIROFISH_BACKEND}/api/graph/ontology/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        text: context || topic,
        description: topic,
      }),
      signal: AbortSignal.timeout(60000),
    }).catch(() => null);

    const ontologyData = ontologyRes?.ok
      ? await ontologyRes.json().catch(() => null)
      : null;

    // Step 3: Trigger graph build
    const graphRes = await fetch(`${MIROFISH_BACKEND}/api/graph/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);

    const graphData = graphRes?.ok
      ? await graphRes.json().catch(() => null)
      : null;

    // Step 4: If graph is ready, try simulation
    let simData = null;
    if (graphData?.success && graphData?.data?.graph_id) {
      const simRes = await fetch(`${MIROFISH_BACKEND}/api/simulation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: topic,
          description: context || topic,
        }),
        signal: AbortSignal.timeout(30000),
      }).catch(() => null);

      simData = simRes?.ok
        ? await simRes.json().catch(() => null)
        : null;
    }

    return NextResponse.json({
      result: [
        `📊 Projeto: ${topic}`,
        `🆔 ID: ${projectId}`,
        '',
        ontologyData?.success
          ? `✅ Ontologia: ${ontologyData.data?.entity_count || '?'} entidades detectadas`
          : '⏳ Ontologia: geração em andamento...',
        '',
        graphData?.success
          ? `✅ Grafo: construído (${graphData.data?.task_id || 'OK'})`
          : '⏳ Grafo: construção em andamento...',
        '',
        simData?.success
          ? `✅ Simulação: criada (${simData.data?.simulation_id || 'OK'})`
          : '📋 Simulação: aguardando grafo completo',
      ].join('\n'),
      project_id: projectId,
    });
  } catch (e) {
    return NextResponse.json({
      result: `Erro: ${e instanceof Error ? e.message : 'Falha na conexão com MiroFish'}`,
      error: true,
    });
  }
}
