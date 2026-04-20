import { NextResponse } from 'next/server';

const MIROFISH_BACKEND = 'https://mirofish-api.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

// Chinese → Portuguese translation map for MiroFish responses
const ZH_PT: Record<string, string> = {
  '请提供 project_id': 'Informe o project_id',
  '项目创建成功': 'Projeto criado com sucesso',
  '模拟创建成功': 'Simulação criada com sucesso',
  '请提供项目名称': 'Informe o nome do projeto',
};

function translateResponse(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };
  for (const [key, val] of Object.entries(result)) {
    if (typeof val === 'string') {
      for (const [zh, pt] of Object.entries(ZH_PT)) {
        if (val.includes(zh)) {
          result[key] = (val as string).replace(zh, pt);
        }
      }
    }
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, context } = body;

    // Step 1: Create a project first
    const projRes = await fetch(`${MIROFISH_BACKEND}/api/graph/project/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: topic, description: context || topic }),
      signal: AbortSignal.timeout(15000),
    });

    let project: Record<string, unknown> = {};
    if (projRes.ok) {
      project = await projRes.json();
    } else {
      // Try to read the error
      const errText = await projRes.text().catch(() => '');
      // Maybe project/create doesn't exist, try simulation/create directly
      project = { id: null, error: errText };
    }

    const projectId = project.id || project.project_id;

    if (!projectId) {
      // Fallback: try simulation/create with topic as name
      const simRes = await fetch(`${MIROFISH_BACKEND}/api/simulation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: topic, description: context || topic, topic }),
        signal: AbortSignal.timeout(15000),
      });
      const simData = await simRes.json().catch(() => ({}));
      return NextResponse.json({
        result: JSON.stringify(translateResponse(simData), null, 2),
        project: translateResponse(project),
      });
    }

    // Step 2: Create simulation with project_id
    const simRes = await fetch(`${MIROFISH_BACKEND}/api/simulation/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, name: topic, description: context || topic }),
      signal: AbortSignal.timeout(15000),
    });
    const simData = await simRes.json().catch(() => ({}));

    // Step 3: Try to build the graph
    const graphRes = await fetch(`${MIROFISH_BACKEND}/api/graph/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);
    const graphData = graphRes?.ok ? await graphRes.json().catch(() => null) : null;

    return NextResponse.json({
      result: [
        `Projeto: ${topic}`,
        `ID: ${projectId}`,
        '',
        graphData ? `Grafo: ${JSON.stringify(graphData, null, 2)}` : 'Grafo em construção...',
        '',
        `Simulação: ${JSON.stringify(translateResponse(simData), null, 2)}`,
      ].join('\n'),
      project: translateResponse(project as Record<string, unknown>),
    });
  } catch (e) {
    return NextResponse.json({
      result: `Erro: ${e instanceof Error ? e.message : 'Falha na conexão'}`,
    });
  }
}
