import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  let errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.toString()));
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  if (errors.length > 0) {
    console.error("ERRORS FOUND:");
    console.error(errors.join('\n'));
    process.exit(1);
  } else {
    console.log("NO ERRORS!");
  }
  await browser.close();
})();
