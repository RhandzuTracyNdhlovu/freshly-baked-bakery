export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://rhandzutracyndhlovu.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    async function isRateLimited(bucket, limit) {
      const key = `rate:${bucket}:${ip}`;
      const count = parseInt((await env.REVIEWS_KV.get(key)) || "0", 10);
      if (count >= limit) return true;
      await env.REVIEWS_KV.put(key, String(count + 1), { expirationTtl: 3600 });
      return false;
    }

    try {
      if (url.pathname === "/reviews" && request.method === "GET") {
        const list = await env.REVIEWS_KV.list({ prefix: "review:" });
        const reviews = (
          await Promise.all(list.keys.map((k) => env.REVIEWS_KV.get(k.name, "json")))
        ).filter(Boolean);
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        return new Response(JSON.stringify({ reviews }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/reviews" && request.method === "POST") {
        if (await isRateLimited("reviews", 5)) {
          return new Response(JSON.stringify({ error: "Too many submissions. Try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const body = await request.json();
        const name = (body.name || "Anonymous").toString().slice(0, 60);
        const text = (body.text || "").toString().slice(0, 600);
        let rating = parseInt(body.rating, 10);
        if (!rating || rating < 1) rating = 1;
        if (rating > 5) rating = 5;
        if (!text) {
          return new Response(JSON.stringify({ error: "Review text is required." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const id = crypto.randomUUID();
        await env.REVIEWS_KV.put(
          `review:${id}`,
          JSON.stringify({ name, rating, text, date: new Date().toISOString() })
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/messages" && request.method === "POST") {
        if (await isRateLimited("messages", 5)) {
          return new Response(JSON.stringify({ error: "Too many submissions. Try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const body = await request.json();
        const name = (body.name || "Anonymous").toString().slice(0, 60);
        const contact = (body.contact || "").toString().slice(0, 100);
        const text = (body.text || "").toString().slice(0, 800);
        if (!text) {
          return new Response(JSON.stringify({ error: "Message text is required." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const id = crypto.randomUUID();
        await env.REVIEWS_KV.put(
          `message:${id}`,
          JSON.stringify({ name, contact, text, date: new Date().toISOString() })
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Worker error:", err.message, err.stack);
      return new Response(
        JSON.stringify({ error: "Something went wrong processing the request." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
