// pages/api/proxy.js
import fetch from 'node-fetch';
import { URL } from 'url';
import cheerio from 'cheerio';

const ALLOWED_HOST = 'animekai.to';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');

  let target;
  try {
    target = new URL(url);
  } catch (e) {
    return res.status(400).send('Invalid url');
  }

  // Only allow requests to the allowed host
  if (target.hostname !== ALLOWED_HOST) {
    return res.status(403).send('Host not allowed');
  }

  try {
    // Forward headers as needed (but don't forward client cookies blindly)
    const forwardedHeaders = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      Accept: req.headers.accept || '*/*'
    };

    const r = await fetch(target.toString(), {
      method: 'GET',
      headers: forwardedHeaders,
      redirect: 'follow',
    });

    // Pass through non-HTML content (images, css, js, etc.)
    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      // stream binary data directly
      const buffer = await r.arrayBuffer();
      const body = Buffer.from(buffer);
      res.setHeader('Content-Type', contentType);
      return res.status(r.status).send(body);
    }

    // For HTML, rewrite links so they go back through /api/proxy?url=<abs-url>
    const html = await r.text();
    const $ = cheerio.load(html, { decodeEntities: false });

    // rewrite href/src for common tags
    $('[href]').each((i, el) => {
      const orig = $(el).attr('href');
      try {
        const abs = new URL(orig, target).toString();
        $(el).attr('href', `/api/proxy?url=${encodeURIComponent(abs)}`);
      } catch (e) {}
    });
    $('[src]').each((i, el) => {
      const orig = $(el).attr('src');
      try {
        const abs = new URL(orig, target).toString();
        $(el).attr('src', `/api/proxy?url=${encodeURIComponent(abs)}`);
      } catch (e) {}
    });

    // rewrite form actions
    $('form[action]').each((i, el) => {
      const orig = $(el).attr('action');
      try {
        const abs = new URL(orig, target).toString();
        $(el).attr('action', `/api/proxy?url=${encodeURIComponent(abs)}`);
      } catch (e) {}
    });

    // Optionally remove Content-Security-Policy headers from the original (we control response)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send($.html());
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).send('Proxy error');
  }
}
