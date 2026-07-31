import { HttpAgent, HttpsAgent } from 'agentkeepalive';

export const httpAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  freeSocketTimeout: 30000,
  timeout: 10000,
});

export const httpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  freeSocketTimeout: 30000,
  timeout: 10000,
});
