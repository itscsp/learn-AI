import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import {streamChat} from './chatServer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;
app.use(cors());
app.use(express.json())

app.use(express.static(path.join(__dirname, '../public')));


app.get("/api/stream", async (req, res) => {
  const {sessionId, question} = req.query;

  if(!question.trim()) {
    return res.status(400).json({error: "Questions is requered"});
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    for await (const chunk of streamChat(sessionId || "default", question.trim())) {
      res.write(`data: ${JSON.stringify({chunk})}\n\n`)
    }

    res.write("data: [DONE]\n\n");
  } catch(err) {
    res.write(`data: ${JSON.stringify({error: err.message})}\n\n`);
  } finally {
    res.end();
  }
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
