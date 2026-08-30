/**
 * Local dev server for the Worker. The Cloudflare runtime (workerd) needs
 * macOS 13.5+, so `wrangler dev` can't run on older machines — this mounts
 * the real `fetch` handler on a plain Node HTTP server instead.
 *
 *   npm --workspace worker run dev
 */
import { createServer } from 'node:http';
import worker from './src/index';

const PORT = Number(process.env.PORT ?? 8787);

createServer(async (nodeReq, nodeRes) => {
  const url = `http://localhost:${PORT}${nodeReq.url ?? '/'}`;
  const request = new Request(url, {
    method: nodeReq.method,
    headers: nodeReq.headers as HeadersInit,
  });

  // No MARKET_RL binding and no edge cache locally; the worker degrades to its
  // in-process limiter and skips caching.
  const ctx = { waitUntil: (p: Promise<unknown>) => void p, passThroughOnException: () => {} };
  const response = await worker.fetch(request, {}, ctx as ExecutionContext);

  nodeRes.statusCode = response.status;
  response.headers.forEach((value, name) => nodeRes.setHeader(name, value));
  nodeRes.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => {
  console.log(`trendlens worker (dev) → http://localhost:${PORT}/api/candles?symbol=AAPL&market=us&interval=1d`);
});
