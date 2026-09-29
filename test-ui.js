import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  await page.goto("http://localhost:8081/login");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshot-login.png" });
  console.log("Screenshot login done");
  
  await browser.close();
})();
