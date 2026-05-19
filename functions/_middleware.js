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
  
  // For all other requests, serve the SPA
  return context.env.ASSETS.fetch(new Request('/index.html', context.request));
}
