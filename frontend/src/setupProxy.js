const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // keep /api prefix
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error: Backend server not available');
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log proxy requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`);
        }
      }
    })
  );
}; 