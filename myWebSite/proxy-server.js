import http from 'http';
import https from 'https';
import { URL } from 'url';

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost');
  
  if (urlObj.pathname === '/proxy') {
    const targetUrl = urlObj.searchParams.get('url');
    
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }
    
    const targetUrlObj = new URL(targetUrl);
    const options = {
      hostname: targetUrlObj.hostname,
      path: targetUrlObj.pathname + targetUrlObj.search,
      method: 'GET',
      headers: {
        'Referer': 'https://music.163.com/',
        'Origin': 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    
    const proxyReq = https.request(options, (proxyRes) => {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      };
      
      if (proxyRes.headers['content-type']) {
        headers['Content-Type'] = proxyRes.headers['content-type'];
      }
      
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    });
    
    proxyReq.end();
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
