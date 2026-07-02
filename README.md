# Telegram Proxy per Vercel (Gratuito)

Questo mini-progetto funge da proxy inverso sicuro per l'API di Telegram (`api.telegram.org`), consentendo a CineAgent (su Hugging Face Spaces) di comunicare con Telegram bypassando i blocchi DNS/IP.

## Caratteristiche
- **100% Gratuito**: Utilizza il piano Free di Vercel.
- **Zero Configurazione**: Pronto all'uso, non richiede `package.json` o dipendenze esterne (usa le API native di Node 18+).
- **Streaming Diretto**: Gestisce l'upload di file e foto senza problemi.
- **Sicuro**: Puoi limitare l'accesso solo al tuo Bot Token usando una variabile d'ambiente.

---

## Guida all'installazione (5 minuti)

### 1. Crea un nuovo repository privato su GitHub
1. Vai su [github.com](https://github.com) e crea un nuovo repository (chiamalo es. `telegram-proxy`).
2. Scegli **Private** (Consigliato per sicurezza).
3. Carica all'interno di questo repository solo i due file presenti in questa cartella:
   - `vercel.json`
   - la cartella `api` (con al suo interno `index.js`)

*(Puoi trascinare i file direttamente nella pagina web di GitHub o usare Git da terminale).*

---

### 2. Collega e Deploya su Vercel
1. Vai su [vercel.com](https://vercel.com) e registrati o accedi usando il tuo account **GitHub**.
2. Clicca su **Add New** → **Project**.
3. Trova il repository appena creato (`telegram-proxy`) e clicca su **Import**.
4. Sotto **Environment Variables** (Variabili d'ambiente), aggiungi la seguente variabile per sicurezza:
   - **Name**: `ALLOWED_BOT_TOKEN`
   - **Value**: Il tuo token del bot Telegram (es. `8989962503:AAERlQ1...`)
5. Clicca su **Deploy**.

In circa 30 secondi il progetto sarà online! Vercel ti fornirà un URL gratuito tipo:
`https://telegram-proxy-tuo-username.vercel.app`

---

### 3. Configura Hugging Face
1. Vai su Hugging Face Spaces → **Settings** → **Variables and secrets**.
2. Modifica o crea il segreto:
   - **Name**: `TELEGRAM_API_BASE_URL`
   - **Value**: L'URL che ti ha fornito Vercel (es. `https://telegram-proxy-tuo-username.vercel.app`)
3. Salva e fai un **Factory Reboot** dello Space.
