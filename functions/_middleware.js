// Cloudflare Pages middleware for SPA routing
export function onRequest(context) {
  const url = new URL(context.request.url);
  
  // If it's an API request, proxy to the backend
  if (url.pathname.startsWith('/api/')) {
    return context.next();
  }
  
  // For all other requests, serve the SPA
  return context.env.ASSETS.fetch(new Request('/index.html', context.request));
}
