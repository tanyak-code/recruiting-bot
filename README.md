# Ashby × Claude Screener — Local Setup

## What's in this folder

- `server.js` — tiny proxy server (no dependencies, runs on Node.js)
- `screener.html` — open this in your browser once the server is running

---

## Setup (one time)

### 1. Make sure Node.js is installed
Open Terminal and run:
```
node --version
```
If you see a version number, you're good. If not, download from https://nodejs.org (LTS version).

### 2. Add your API keys to server.js
Open `server.js` in any text editor and replace the two placeholders near the top:

```js
const ASHBY_API_KEY    = "YOUR_ASHBY_API_KEY";
const ANTHROPIC_API_KEY = "YOUR_ANTHROPIC_API_KEY";
```

**Ashby API key:**
- Go to Ashby → Settings → API Keys
- Create a new key with `candidatesRead` and `jobsRead` permissions
- Copy and paste it in

**Anthropic API key:**
- Go to https://console.anthropic.com → API Keys
- Create or copy an existing key

### 3. Start the server
In Terminal, navigate to this folder and run:
```
node server.js
```
You should see:
```
✓ Ashby screener proxy running at http://localhost:3131
  Open screener.html in your browser to get started.
```

### 4. Open the screener
Open `screener.html` in Chrome or Safari (double-click it or drag it into your browser).

The green dot in the top-right corner confirms the server is connected.

---

## Using it

1. Your open jobs load automatically in the left panel
2. Search or click to select a job
3. Hit **Fetch & screen →**
4. Cards appear in real time, sorted by score, as each candidate is screened
5. Click any card to expand the summary, strength, and concern

---

## Stopping the server
Press `Ctrl + C` in Terminal.

## Restarting next time
Just run `node server.js` again — no reinstall needed.

---

## Notes

- Screens up to 25 active applications per run
- Screening quality is based on structured Ashby profile data (work history, skills, education)
  Candidates with thin profiles will score less accurately than those with full history filled in
- The Anthropic API key will incur a small cost per run (~$0.01–0.05 per batch of 25 candidates)
- Your keys stay on your machine — they're never sent anywhere except Ashby and Anthropic
