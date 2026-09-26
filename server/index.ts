import express from "express";
import cors from "cors";
import { streamAgent } from "./agent/agent";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.post("/competitive-analysis", async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName || companyName == "") {
      return res.status(400).json({
        error: "please provide company name",
      });
    }
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    for await (const event of streamAgent(companyName)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.write("event: done\ndata: {}\n\n");
    return res.end();
  } catch (error) {
    if (res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error:
            error instanceof Error ? error.message : "Internal server error",
        })}\n\n`,
      );
      return res.end();
    }
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.listen(3000, () => {
  console.log("up and running");
});
