const ALLOWED_BOT_TOKEN = process.env.ALLOWED_BOT_TOKEN || "";

module.exports = async (req, res) => {
  // 1. Configura gli header CORS per consentire l'accesso
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Bot-Token, Authorization");

  // Gestione preflight CORS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 2. Estrai il token del bot Telegram
  let botToken = req.headers["x-bot-token"];

  // Leggi il path originale: Vercel esegue la riscrittura interna modificando req.url
  // ma passa il path originale nel parametro query 'path' grazie alla regola in vercel.json.
  let path = "";
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    path = parsedUrl.searchParams.get("path") || req.url || "";
  } catch (e) {
    path = req.url || "";
  }

  if (!botToken) {
    // Estrai dal path (es. /bot123456:ABC.../getMe oppure /123456:ABC.../getMe)
    const m = path.match(/^\/(?:bot)?([^/]+)(\/.*)?$/);
    if (m) {
      botToken = m[1];
    }
  }

  // 3. Verifica di sicurezza
  if (ALLOWED_BOT_TOKEN && botToken !== ALLOWED_BOT_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized: invalid or missing bot token" });
  }

  if (!botToken) {
    return res.status(400).json({ ok: false, error: "Missing bot token. Pass it via X-Bot-Token header or path." });
  }

  // 4. Costruisci l'URL finale per Telegram
  const upstreamPath = path.replace(/^\/(?:bot)?[^/]+/, "");
  const upstreamUrl = `https://api.telegram.org/bot${botToken}${upstreamPath}`;

  // 5. Clona gli header originali per inoltrarli a Telegram (escludendo quelli locali/host)
  const headers = {};
  const skipHeaders = new Set([
    "host",
    "x-bot-token",
    "connection",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-real-ip"
  ]);

  for (const [key, value] of Object.entries(req.headers)) {
    if (!skipHeaders.has(key.toLowerCase()) && value) {
      headers[key] = value;
    }
  }
  headers["Host"] = "api.telegram.org";

  try {
    // 6. Inoltra la richiesta a Telegram
    // Usando bodyParser: false, passiamo direttamente lo stream originale di Node (req)
    // Questo garantisce compatibilità al 100% anche con upload di file/immagini (multipart/form-data)
    const options = {
      method: req.method,
      headers: headers,
      redirect: "manual"
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = req;
    }

    const upstreamResponse = await fetch(upstreamUrl, options);

    // Imposta lo status code della risposta
    res.status(upstreamResponse.status);

    // Inoltra gli header ricevuti da Telegram
    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (key.toLowerCase() !== "content-encoding" && key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    }

    // Inoltra il body di risposta come buffer
    const responseData = await upstreamResponse.arrayBuffer();
    return res.send(Buffer.from(responseData));

  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(502).json({ ok: false, error: "Upstream error: " + error.message });
  }
};

// Disabilita il body parser automatico di Vercel per poter inoltrare
// lo stream raw della richiesta (essenziale per l'upload di file)
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
