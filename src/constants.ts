export const searchExample = `// Full TypeScript support for both puppeteer and the DOM
export default async ({ page }: { page: Page }) => {

  // Full puppeteer API is available
  await page.goto('https://google.com/');
  await page.type('textarea', 'browserless.io');
  await Promise.all([
    page.keyboard.press('Enter'),
    page.waitForNavigation(),
  ]);

  // Logs show up in the browser's devtools
  console.log(\`I show up in the page's console!\`);

  const topLinks = await page.evaluate(() => {
    const results = [...document.querySelectorAll('#search a')] as HTMLElement[];
    return [...results].map(el => [el.innerText, el.getAttribute('href')]);
  });

  // Can pause by injecting a "debugger;" statement. Uncomment to see the magic
  // await page.evaluate(() => { debugger; });

  console.table(topLinks);
};`;

export const screenshotExample = `// Let's load up a cool dashboard and screenshot it!
export default async ({ page }: { page: Page }) => {
  await page.goto('https://play.grafana.org/d/000000029/prometheus-demo-dashboard?orgId=1&refresh=5m&kiosk', { waitUntil: 'networkidle0'});

  // Enlarge the viewport so we can capture it.
  await page.setViewport({ width: 1920, height: 1080 });

  // Return the screenshot buffer which will trigger this editor to download it.
  return page.screenshot({ fullPage: true });
};`;

export const pdfExample = `// For PDFs, let's take some API content and inject some simple styles
export default async ({ page }: { page: Page }) => {

  // Let's get React's documentation and scrape out
  // their actual API docs without all the other stuff.
  await page.goto('https://reactjs.org/docs/react-api.html');
  const apiContent = await page.evaluate(() => document.querySelector('article').innerHTML);

  // Now, let's get some simple markdown CSS for print
  await page.goto('https://raw.githubusercontent.com/simonlc/Markdown-CSS/master/markdown.css');
  const stylesheet = await page.evaluate(() => document.body.innerText);

  // Finally, let's inject the above in a blank page and print it.
  await page.goto('about:blank');
  await page.setContent(apiContent);
  await page.addStyleTag({ content: stylesheet });
  
  // Return a PDF buffer to trigger the editor to download.
  return page.pdf();
};`;

export const scrapeExample = `// In this example, we'll scrape links on HN
export default async ({ page }: { page: Page }) => {
  await page.goto('https://news.ycombinator.com');

  // Here, we inject some JavaScript into the page to build a list of results
  const items = await page.evaluate(() => {
    const elements = [...document.querySelectorAll('.athing a')];
    const results = elements.map((el: HTMLAnchorElement) => ({
      title: el.textContent,
      href: el.href,
    }));
    return JSON.stringify(results);
  });

  // Finally, we return an object, which triggers a JSON file download
  return JSON.parse(items);
};`;

export const blankExample = `export default async ({ page }: { page: Page }) => {
  // Do Something with the page and return!
  // The editor will detect the return value, and either download
  // a JSON/PDF/PNG or Plain-text file. If you don't return
  // anything then nothing will happen.
};`;

export const indexCode = `const { default: start } = require('./start.js');
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'wss://chrome.browserless.io'
  });
  const page = await browser.newPage();

  await start({ page, browser });

  return browser.close();
})()
.then(() => console.log('Script complete!'))
.catch((err) => console.error('Error running script' + err));`;
