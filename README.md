# Inktrace

Forensic AI document detector. Paste text or upload `.txt` / `.pdf` / `.docx`, then scan. Inktrace combines a writing fingerprint (burstiness, lexical diversity, sentence rhythm) with a Grok analysis pass.

Treat the score as **evidence, not proof**.

## Stack

- React 19 + TanStack Start / Router
- Tailwind CSS v4
- xAI API (`grok-4.5`) for the forensic pass
- pdf.js + mammoth for file extraction

## Local setup

```bash
git clone https://github.com/manikantakarthik30-blip/inktrace.git
cd inktrace
npm install
cp .env.example .env
```

Open `.env` and paste your key:

```
XAI_API_KEY=xai-your-real-key
```

Get a key from [console.x.ai](https://console.x.ai). Never commit `.env`.

Then:

```bash
npm run dev
```

Open the URL Vite prints. Use **Sample AI** / **Sample human**, or paste your own document and **Scan document**.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `XAI_API_KEY` | server only | xAI chat completions. Never expose this to the browser. |

## License

MIT
