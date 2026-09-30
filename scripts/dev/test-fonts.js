import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <style>
        @import url("https://fonts.googleapis.com/css2?family=Chivo:wght@800&display=swap");
        body {
          background-color: #0F1115; color: #F2CE56;
          font-family: "Chivo", sans-serif; padding: 40px; display: flex; flex-direction: column; gap: 40px;
        }
        .normal { font-variant-numeric: normal; }
        .tabular { font-variant-numeric: tabular-nums; }
        .row { display: flex; flex-direction: column; }
        span { font-size: 48px; font-weight: 800; }
        h1 { color: #EEF3F3; font-size: 16px; font-family: sans-serif; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="row normal">
        <h1>Chivo - Normal (Default)</h1>
        <span>R$ 11,11</span>
        <span>R$ 99,99</span>
      </div>
      <div class="row tabular">
        <h1>Chivo - Tabular-nums</h1>
        <span>R$ 11,11</span>
        <span>R$ 99,99</span>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "tabular-nums-test.png" });
  await browser.close();
  console.log("Tabular-nums screenshot generated: tabular-nums-test.png");
})();
