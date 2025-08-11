// pages/index.js
import { useEffect, useState } from 'react';

export default function Home() {
  const [html, setHtml] = useState(null);
  // the proxied homepage of animekai.to
  const homepage = '/api/proxy?url=' + encodeURIComponent('https://animekai.to/');

  useEffect(() => {
    async function load() {
      const r = await fetch(homepage);
      const text = await r.text();
      setHtml(text);
    }
    load();
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <h1>Proxied animekai.to viewer</h1>
      <div
        id="proxied"
        dangerouslySetInnerHTML={{ __html: html || '<p>Loading...</p>' }}
        style={{ border: '1px solid #ddd', padding: 8 }}
      />
    </div>
  );
}
