const { createServer } = require('http' );
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    // Add health check endpoint
    if (req.url === '/health') {
      res.statusCode = 200;
      res.end('OK');
      return;
    }
    
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Server started on http://0.0.0.0:${port}` );
    console.log(`> Environment: ${process.env.NODE_ENV}`);
    console.log(`> Using PORT: ${port}`);
  });
});
