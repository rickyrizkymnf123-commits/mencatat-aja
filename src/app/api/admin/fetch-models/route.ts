import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { baseUrl, apiKey } = await request.json();

    if (!baseUrl) {
      return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const targetUrl = cleanBaseUrl.endsWith('/models') ? cleanBaseUrl : `${cleanBaseUrl}/models`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ 
        error: `Provider API returned status ${res.status}: ${errText.substring(0, 100) || 'Error fetching models'}` 
      }, { status: res.status });
    }

    const data = await res.json();
    let modelIds: string[] = [];

    if (data && Array.isArray(data.data)) {
      modelIds = data.data.map((m: any) => m.id || m.name).filter(Boolean);
    } else if (Array.isArray(data)) {
      modelIds = data.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
    }

    if (modelIds.length === 0) {
      return NextResponse.json({ error: 'Model list returned empty from provider API' }, { status: 404 });
    }

    return NextResponse.json({ models: modelIds });
  } catch (err: any) {
    console.error('Fetch models API proxy error:', err);
    return NextResponse.json({ 
      error: err.message || 'Failed to connect to AI provider API endpoint' 
    }, { status: 500 });
  }
}
