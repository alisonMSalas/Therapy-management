import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const isProduction = process.env['NODE_ENV'] === 'production';

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Middleware to prevent serving pre-rendered HTML files
 * This forces dynamic rendering for all HTML content
 */
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
    return next(); // Let Angular handle HTML rendering dynamically
  }
  next();
});

/**
 * Serve static files from /browser (CSS, JS, images, etc.)
 * But NOT HTML files - those should be rendered dynamically
 */
app.use(
  express.static(browserDistFolder, {
    // Only serve non-HTML files
    index: false,
    redirect: false,
    // Control cache headers explicitly
    setHeaders: (res, filePath) => {
      if (isProduction) {
        const fileName = filePath.split(/[\\\/]/).pop() ?? '';
        const hasHash = /[.-][A-Za-z0-9]{8,}\./.test(fileName);
        if (hasHash) {
          // Long-term cache for hashed assets
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // For non-hashed assets, revalidate
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      } else {
        // Disable caching entirely in development
        res.setHeader('Cache-Control', 'no-store');
      }
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application dynamically.
 * This ensures fresh data is always fetched from the database.
 */
app.use('/**', (req, res, next) => {
  // Always render dynamically to get fresh data
  angularApp
    .handle(req)
    .then((response: unknown) =>
      response ? writeResponseToNodeResponse(response as any, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`Dynamic rendering enabled - fresh data will be fetched on each request`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
