// Cloudflare Pages middleware for SPA routing and API proxy
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // If it's an API request, proxy to the backend
  if (url.pathname.startsWith('/api/')) {
    const backendUrl = 'https://lishe-pamoja.onrender.com';
    const apiRequest = new Request(`${backendUrl}${url.pathname}${url.search}`, {
      method: context.request.method,
      headers: context.request.headers,
      body: context.request.body
    });
    
    try {
      const response = await fetch(apiRequest);
      return response;
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'API request failed', 
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Check if it's a static asset (CSS, JS, images, etc.)
  const isStaticAsset = url.pathname.startsWith('/assets/') || 
      url.pathname.startsWith('/favicon.') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico');
  
  if (isStaticAsset) {
    // Serve static assets directly from ASSETS
    const assetResponse = await context.env.ASSETS.fetch(url.pathname, context.request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
    // If asset not found, continue to SPA fallback
  }
  
  // For all other requests (SPA routes), serve index.html
  const indexResponse = await context.env.ASSETS.fetch('/index.html', context.request);
  return new Response(indexResponse.body, {
    status: 200,
    headers: {
      ...indexResponse.headers,
      'Content-Type': 'text/html'
    }
  });
}
