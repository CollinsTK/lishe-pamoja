// Cloudflare Pages middleware for SPA routing and API proxy
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // If it's an API request, proxy to the backend
  if (url.pathname.startsWith('/api/')) {
    const backendUrl = 'https://lishe-pamoja.onrender.com'; // Your backend URL
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
  
  // If it's a static asset (CSS, JS, images, etc.), serve it directly
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.startsWith('/favicon.') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg')) {
    return context.next();
  }
  
  // For all other requests, serve the SPA
  return context.env.ASSETS.fetch(new Request('/index.html', context.request));
}
