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

  // 2. Estrai il token del bot Telegram e il metodo dai parametri query
  // req.url contiene il path di riscrittura interna (es. /api?token=...&method=...)
  let botToken = req.headers["x-bot-token"];
  let method = "";
  let queryString = "";

  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    
    if (!botToken) {
      botToken = parsedUrl.searchParams.get("token");
    }
    method = parsedUrl.searchParams.get("method") || "";

    // Ricostruisci gli eventuali altri parametri query originari (escludendo token e method)
    const queryParams = new URLSearchParams(parsedUrl.search);
    queryParams.delete("token");
    queryParams.delete("method");
    const qStr = queryParams.toString();
    queryString = qStr ? "?" + qStr : "";
  } catch (e) {
    console.error("URL parsing error:", e);
  }

  // 3. Verifiche di sicurezza
  if (ALLOWED_BOT_TOKEN && botToken !== ALLOWED_BOT_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized: invalid or missing bot token" });
  }

  if (!botToken) {
    return res.status(400).json({ ok: false, error: "Missing bot token." });
  }

  if (!method) {
    return res.status(400).json({ ok: false, error: "Missing method." });
  }

  // 4. Costruisci l'URL finale verso Telegram
  const upstreamUrl = `https://api.telegram.org/bot${botToken}/${method}${queryString}`;

  // 5. Clona gli header originali per inoltrarli a Telegram
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
    const options = {
      method: req.method,
      headers: headers,
      redirect: "manual"
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = req;
      options.duplex = "half";
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

    // Inoltra il body come buffer
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
