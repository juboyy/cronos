import { NextResponse } from 'next/server';

const BETTAFISH_BACKEND = 'https://bettafish.216-238-124-248.nip.io';

export const dynamic = 'force-dynamic';

// Chinese → Portuguese for API responses
const ZH_PT: [RegExp, string][] = [
  [/系统已启动/g, 'Sistema já iniciado'],
  [/系统正在启动/g, 'Sistema iniciando'],
  [/应用已经在运行/g, 'Aplicação já em execução'],
  [/启动失败/g, 'Falha ao iniciar'],
  [/暂无可用的知识图谱数据/g, 'Nenhum dado de grafo disponível'],
  [/论坛启动失败/g, 'Falha ao iniciar fórum'],
  [/系统初始化/g, 'Inicialização do sistema'],
  [/请提供/g, 'Informe'],
  [/搜索/g, 'Busca'],
  [/成功/g, 'Sucesso'],
  [/失败/g, 'Falha'],
];

function translateJson(text: string): string {
  let result = text;
  for (const [re, pt] of ZH_PT) {
    result = result.replace(re, pt);
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const res = await fetch(`${BETTAFISH_BACKEND}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    const translated = translateJson(text);
    return new NextResponse(translated, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ results: {}, error: 'Conexão falhou' });
  }
}
