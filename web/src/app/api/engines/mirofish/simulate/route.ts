import { NextRequest, NextResponse } from 'next/server';

const MIROFISH_API = process.env.MIROFISH_API_URL || 'https://mirofish-api.216-238-124-248.nip.io';

async function mirofish(path: string, options: RequestInit = {}) {
  const res = await fetch(`${MIROFISH_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiroFish error ${res.status}: ${text}`);
  }
  
  return res.json();
}

// GET: list simulations, get status, get profiles
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';
  const simId = searchParams.get('id');
  const projectId = searchParams.get('project_id') || 'proj_cronos_memgraph';
  
  try {
    switch (action) {
      case 'list': {
        const data = await mirofish(`/api/simulation/list?project_id=${projectId}`);
        return NextResponse.json(data);
      }
      case 'status': {
        if (!simId) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const data = await mirofish(`/api/simulation/${simId}`);
        return NextResponse.json(data);
      }
      case 'profiles': {
        if (!simId) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const data = await mirofish(`/api/simulation/${simId}/profiles`);
        return NextResponse.json(data);
      }
      case 'config': {
        if (!simId) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const data = await mirofish(`/api/simulation/${simId}/config`);
        return NextResponse.json(data);
      }
      case 'run-status': {
        if (!simId) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const data = await mirofish(`/api/simulation/${simId}/run-status`);
        return NextResponse.json(data);
      }
      case 'entities': {
        // Read entities from Memgraph via the graph API
        const graphId = searchParams.get('graph_id') || 'cronos_memgraph';
        const data = await mirofish(`/api/simulation/entities/${graphId}`);
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST: create, prepare, start, stop simulation
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'create';
  
  try {
    const body = await req.json().catch(() => ({}));
    
    switch (action) {
      case 'create': {
        const data = await mirofish('/api/simulation/create', {
          method: 'POST',
          body: JSON.stringify({
            project_id: body.project_id || 'proj_cronos_memgraph',
            graph_id: body.graph_id || 'cronos_memgraph',
            enable_twitter: body.enable_twitter ?? true,
            enable_reddit: body.enable_reddit ?? true,
          }),
        });
        return NextResponse.json(data);
      }
      case 'prepare': {
        const data = await mirofish('/api/simulation/prepare', {
          method: 'POST',
          body: JSON.stringify({
            simulation_id: body.simulation_id,
            simulation_requirement: body.requirement || body.simulation_requirement || '',
            document_text: body.document_text || body.context || '',
            use_llm_for_profiles: body.use_llm ?? true,
            parallel_profile_count: body.parallel || 5,
          }),
        });
        return NextResponse.json(data);
      }
      case 'prepare-status': {
        const data = await mirofish('/api/simulation/prepare/status', {
          method: 'POST',
          body: JSON.stringify({ simulation_id: body.simulation_id }),
        });
        return NextResponse.json(data);
      }
      case 'start': {
        const data = await mirofish('/api/simulation/start', {
          method: 'POST',
          body: JSON.stringify({
            simulation_id: body.simulation_id,
            max_rounds: body.max_rounds || 10,
          }),
        });
        return NextResponse.json(data);
      }
      case 'stop': {
        const data = await mirofish('/api/simulation/stop', {
          method: 'POST',
          body: JSON.stringify({ simulation_id: body.simulation_id }),
        });
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
