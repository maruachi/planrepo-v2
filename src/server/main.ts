import { createApp } from "./app.js";
import { loadAppConfig } from "./app-config.js";
import { internalError } from "./errors.js";

try {
  const config = loadAppConfig();
  const app = await createApp(config);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try { await app.close(); }
    catch { console.error("PlanRepo could not close cleanly."); process.exitCode = 1; }
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  try {
    await app.listen({ host: config.host, port: config.port });
    console.log(`PlanRepo: http://${config.host}:${config.port}`);
  } catch (error) {
    await close();
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE") {
      console.error(`PlanRepo port ${config.port} is already in use. Choose another PLANREPO_PORT.`);
      process.exitCode = 1;
    } else if (code === "EPERM" || code === "EACCES") {
      console.error("PlanRepo cannot open the local port. Allow local network access and try again.");
      process.exitCode = 1;
    } else {
    throw error;
    }
  }
} catch (error) {
  const safe = internalError(error);
  console.error(`PlanRepo startup failed (${safe.code}): ${safe.message}`);
  process.exitCode = 1;
}
