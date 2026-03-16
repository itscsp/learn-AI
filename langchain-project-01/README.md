# LangChain Crash Course → Node.js (Grok Edition)

A complete port of the Python LangChain crash course to Node.js, powered by **xAI Grok** via its OpenAI-compatible API.

## Why Grok?
- **$25 free credits** on signup at [console.x.ai](https://console.x.ai)
- Extra **$150/month free** via the data sharing program
- Very cheap: `grok-4-1-fast-non-reasoning` costs only **$0.20/M input tokens**

## Project Structure

```
langchain-node-grok/
├── src/
│   ├── langchain.js    ← Core library (LLM → Grok, PromptTemplate, Chains, Memory)
│   ├── restaurant.js   ← Restaurant name generator (SequentialChain)
│   ├── demo.js         ← Full crash course walkthrough
│   └── server.js       ← Express web server
├── public/
│   └── index.html      ← Web UI
├── .env.example
└── package.json
```

## Setup

```bash
npm install

cp .env.example .env
# Add your xAI API key to .env:
# XAI_API_KEY=xai-...
# Get it free at: https://console.x.ai
```

## Running

```bash
# Web UI
npm start
# → open http://localhost:3000

# Restaurant generator CLI
npm run restaurant

# Full crash course demo (all concepts)
npm run demo
```

---

## What Changed from Anthropic → Grok

| | Anthropic version | Grok version |
|---|---|---|
| **Package** | `@anthropic-ai/sdk` | `openai` |
| **Env var** | `ANTHROPIC_API_KEY` | `XAI_API_KEY` |
| **Base URL** | (default Anthropic) | `https://api.x.ai/v1` |
| **Model** | `claude-sonnet-4-20250514` | `grok-4-1-fast-non-reasoning` |
| **API style** | Anthropic Messages API | OpenAI Chat Completions (compatible) |

Because Grok is **OpenAI-compatible**, the swap was just 4 lines in `langchain.js`. Everything else — PromptTemplates, Chains, Memory — stayed identical.

## Concept Mapping: Python LangChain → Node.js

| Python (LangChain) | Node.js (this project) |
|---|---|
| `OpenAI(temperature=0.7)` | `new LLM({ temperature: 0.7 })` |
| `PromptTemplate(...)` | `new PromptTemplate({...})` |
| `LLMChain(llm, prompt)` | `new LLMChain({ llm, prompt })` |
| `chain.run("Mexican")` | `await chain.run("Mexican")` |
| `SequentialChain(...)` | `new SequentialChain({...})` |
| `ConversationBufferMemory()` | `new ConversationBufferMemory()` |
| `ConversationBufferWindowMemory(k=1)` | `new ConversationBufferWindowMemory({ k: 1 })` |
| `ConversationChain(llm=llm)` | `new ConversationChain({ llm })` |
