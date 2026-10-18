/**
 * Netlify Function (v2) for the test copy of the shop.
 *
 * Netlify hands over a standard web Request. It is turned into the
 * Lambda-style event that serverless-http understands, passed to the Express
 * app through ../lambda.mjs, and the answer turned back into a Response.
 */
import { handler } from '../lambda.mjs';

export default async (req, context) => {
  const url = new URL(req.url);
  const body = Buffer.from(await req.arrayBuffer());

  const query = {};
  const multiQuery = {};
  for (const [k, v] of url.searchParams) {
    query[k] = v;
    (multiQuery[k] ||= []).push(v);
  }
  const headers = Object.fromEntries(req.headers);
  if (context?.ip && !headers['x-forwarded-for']) headers['x-forwarded-for'] = context.ip;

  const res = await handler(
    {
      httpMethod: req.method,
      path: url.pathname,
      headers,
      queryStringParameters: query,
      multiValueQueryStringParameters: multiQuery,
      body: body.length ? body.toString('base64') : null,
      isBase64Encoded: true,
      requestContext: { identity: { sourceIp: context?.ip } },
    },
    {}
  );

  const out = new Headers();
  for (const [k, v] of Object.entries(res.headers || {})) out.set(k, String(v));
  for (const [k, list] of Object.entries(res.multiValueHeaders || {})) {
    for (const v of list) out.append(k, String(v));
  }
  const payload = res.body == null ? null : res.isBase64Encoded ? Buffer.from(res.body, 'base64') : res.body;
  return new Response(payload, { status: res.statusCode || 200, headers: out });
};

export const config = {
  path: ['/api/*', '/uploads/*', '/robots.txt', '/sitemap.xml'],
};
