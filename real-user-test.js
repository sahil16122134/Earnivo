const { chromium } = require("playwright");

const SITE = "https://earnivo.pages.dev";

(async () => {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const failures = [];
  const apiResults = [];

  page.on("console", msg => {
    // Ignore known Chromium COOP warning.
    if (
      msg.type() === "error" &&
      !msg.text().includes("Cross-Origin-Opener-Policy")
    ) {
      failures.push(`Console error: ${msg.text()}`);
    }
  });

  page.on("pageerror", error => {
    failures.push(`Page error: ${error.message}`);
  });

  page.on("response", async response => {
    const url = response.url();

    if (!url.includes("earnivo-worker.sahilsirsat09.workers.dev")) {
      return;
    }

    const status = response.status();

    let body = "";

    try {
      body = await response.text();
    } catch {}

    apiResults.push({
      method: response.request().method(),
      url,
      status,
      body,
    });

    console.log(
      `[API ${status}] ${response.request().method()} ${url}`
    );

    if (status >= 400) {
      console.log(`Response: ${body}`);
    }
  });

  console.log("======================================");
  console.log(" EARNIVO REAL USER TEST");
  console.log("======================================");

  console.log(`Opening ${SITE}`);

  await page.goto(SITE, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log(`PASS: Site loaded: ${await page.title()}`);

  console.log("");
  console.log("======================================");
  console.log(" LOGIN");
  console.log("======================================");
  console.log("");
  console.log("Log in normally in the opened browser.");
  console.log("Waiting up to 120 seconds...");
  console.log("");

  // Give the actual Firebase application time to authenticate.
  // We don't attempt to fake or inject a Firebase token.
  let authenticated = false;

  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);

    const state = await page.evaluate(() => {
      const text = document.body?.innerText || "";

      return {
        url: location.href,
        text,
        hasLogout:
          /logout|sign out/i.test(text),
        hasDashboard:
          /dashboard|wallet|earn|daily bonus|balance/i.test(text),
      };
    });

    if (
      state.hasLogout ||
      (
        state.hasDashboard &&
        !state.url.endsWith("index.html")
      )
    ) {
      authenticated = true;
      break;
    }

    if (i % 10 === 9) {
      console.log(`Still waiting... ${i + 1}s`);
    }
  }

  console.log("");

  if (!authenticated) {
    console.log("STOP: Could not confirm the signed-in state.");
    console.log(`Current URL: ${page.url()}`);
    console.log("Please make sure login completed successfully.");
    await browser.close();
    process.exit(1);
  }

  console.log("PASS: Login appears successful.");
  console.log(`Current URL: ${page.url()}`);

  // Allow the application's own auth listeners/API calls to finish.
  console.log("");
  console.log("Waiting for application API calls...");
  await page.waitForTimeout(5000);

  console.log("");
  console.log("======================================");
  console.log(" AUTHENTICATED API RESULTS");
  console.log("======================================");

  const expected = [
    "/user",
    "/tasks",
    "/daily-bonus-schedule",
  ];

  for (const endpoint of expected) {
    const matches = apiResults.filter(x =>
      new URL(x.url).pathname === endpoint
    );

    if (matches.length === 0) {
      console.log(`FAIL: ${endpoint} was never requested.`);
      continue;
    }

    const latest = matches[matches.length - 1];

    if (latest.status === 200) {
      console.log(`PASS: ${endpoint} → 200`);
    } else {
      console.log(
        `FAIL: ${endpoint} → ${latest.status}`
      );
    }
  }

  console.log("");
  console.log("======================================");
  console.log(" PAGE CHECK");
  console.log("======================================");

  const bodyText = await page.locator("body").innerText();

  const checks = [
    [
      "Page has content",
      bodyText.trim().length > 50,
    ],
    [
      "No 'Couldn't load' message",
      !bodyText.includes("Couldn't load"),
    ],
    [
      "No 'Bonus unavailable' message",
      !bodyText.includes("Bonus unavailable"),
    ],
    [
      "No 'Sign-in required' message",
      !bodyText.includes("Sign-in required"),
    ],
  ];

  for (const [name, passed] of checks) {
    console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  }

  console.log("");
  console.log("======================================");
  console.log(" JAVASCRIPT ERRORS");
  console.log("======================================");

  if (failures.length === 0) {
    console.log("PASS: No relevant browser errors detected.");
  } else {
    for (const failure of failures) {
      console.log(`FAIL: ${failure}`);
    }
  }

  console.log("");
  console.log("======================================");
  console.log(" TEST RESULT");
  console.log("======================================");

  const criticalFailures = [];

  for (const endpoint of expected) {
    const matches = apiResults.filter(x =>
      new URL(x.url).pathname === endpoint
    );

    if (!matches.length || matches[matches.length - 1].status !== 200) {
      criticalFailures.push(endpoint);
    }
  }

  if (criticalFailures.length === 0) {
    console.log("PASS: Authenticated API smoke test passed.");
    console.log("The application itself successfully reached the Worker.");
  } else {
    console.log("FAIL: Authenticated API test failed.");
    console.log(
      `Failed endpoints: ${criticalFailures.join(", ")}`
    );
  }

  console.log("");
  console.log("Browser remains open for inspection.");
  console.log("Close it manually when finished.");
})();