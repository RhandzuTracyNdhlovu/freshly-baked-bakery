// Cloudflare Worker — Portfolio... wait, Bakery Q&A + Reviews + Messages backend
//
// This single Worker now serves THREE jobs for the bakery site:
//   1. /            (POST) - the existing "Ask About My Work"-style Q&A widget
//      NOTE: this file does not include the original Q&A case-study logic since
//      that belonged to a different project. If you already have a working
//      worker.js for this bakery site, paste ONLY the new /reviews and
//      /messages blocks below into it, inside the same fetch() function,
//      alongside your existing routes. This file is written so you can also
//      deploy it standalone if you don't have Q&A logic to preserve.
//   2. /reviews      (GET)  - returns all customer reviews as JSON
//      /reviews      (POST) - saves a new customer review
//   3. /messages     (POST) - saves a "leave us a message" contact form entry
//
// Storage: Cloudflare Workers KV. You need to bind a KV namespace called
// REVIEWS_KV to this Worker (Settings -> Variables -> KV Namespace Bindings).
// See README-reviews-messages.md for step-by-step setup.

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

    try {
      // ---------------------------------------------------------------
      // GET /reviews - return all stored reviews, newest first
      // ---------------------------------------------------------------
      if (url.pathname === "/reviews" && request.method === "GET") {
        const raw = await env.REVIEWS_KV.get("reviews_list");
        const reviews = raw ? JSON.parse(raw) : [];
        return new Response(JSON.stringify({ reviews }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---------------------------------------------------------------
      // POST /reviews - add a new review
      // Body: { name, rating (1-5), text }
      // ---------------------------------------------------------------
      if (url.pathname === "/reviews" && request.method === "POST") {
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

        const raw = await env.REVIEWS_KV.get("reviews_list");
        const reviews = raw ? JSON.parse(raw) : [];
        reviews.unshift({
          name,
          rating,
          text,
          date: new Date().toISOString(),
        });
        // Keep the most recent 200 reviews to avoid unbounded growth.
        const trimmed = reviews.slice(0, 200);
        await env.REVIEWS_KV.put("reviews_list", JSON.stringify(trimmed));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---------------------------------------------------------------
      // POST /messages - "leave us a message" contact form
      // Body: { name, contact, text }
      // Stored privately in KV; not shown on the public site. Check them
      // in the Cloudflare dashboard under Workers KV -> REVIEWS_KV -> messages_list.
      // ---------------------------------------------------------------
      if (url.pathname === "/messages" && request.method === "POST") {
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

        const raw = await env.REVIEWS_KV.get("messages_list");
        const messages = raw ? JSON.parse(raw) : [];
        messages.unshift({
          name,
          contact,
          text,
          date: new Date().toISOString(),
        });
        const trimmed = messages.slice(0, 500);
        await env.REVIEWS_KV.put("messages_list", JSON.stringify(trimmed));

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
