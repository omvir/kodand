import https from "node:https";

const BASE_URL = process.env.TEST_BASE_URL || "https://kodand.pages.dev";
const TARGET = "https://example.com";
const MODES = ["content", "security", "seo", "performance", "accessibility", "full"];

function request(mode) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ url: TARGET, mode });
    const url = new URL(`${BASE_URL}/api/scan`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf-8") });
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log(`Testing live API: ${BASE_URL}/api/scan\n`);

  for (const mode of MODES) {
    console.log(`=== Mode: ${mode} ===`);
    try {
      const { status, body } = await request(mode);
      console.log(`  HTTP Status: ${status}`);

      if (status === 200) {
        const lines = body.split("\n");
        const events = [];
        let current = [];
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            current.push(line.slice(6));
          } else if (line === "" && current.length > 0) {
            events.push(current.join("\n"));
            current = [];
          }
        }

        const hasResult = events.some((e) => e.includes('"type":"result"'));
        const hasComplete = events.some((e) => e.includes('"type":"complete"'));
        const errorEvents = events.filter((e) => e.includes('"type":"error"'));

        console.log(`  Events received: ${events.length}`);
        console.log(`  Has result: ${hasResult}`);
        console.log(`  Has complete: ${hasComplete}`);
        console.log(`  Errors: ${errorEvents.length}`);

        if (errorEvents.length > 0) {
          for (const err of errorEvents) {
            const msg = err.replace(/\\"/g, '"').replace(/^data: /, "");
            console.log(`  ERROR: ${msg.slice(0, 200)}`);
          }
        }
      } else {
        console.log(`  Body: ${body.slice(0, 200)}`);
      }
    } catch (err) {
      console.log(`  FAILED: ${err.message}`);
    }
    console.log();
  }
}

run();
