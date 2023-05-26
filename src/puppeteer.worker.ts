// Make sure WS transport is loaded and in webpack's cache
import 'puppeteer-core/lib/esm/puppeteer/common/BrowserWebSocketTransport';
import { Browser } from 'puppeteer-core/lib/esm/puppeteer/api/Browser';
import { CDPSession } from 'puppeteer-core/lib/esm/puppeteer/common/Connection';
import { Page } from 'puppeteer-core/lib/esm/puppeteer/api/Page';


import { Puppeteer } from 'puppeteer-core/lib/esm/puppeteer/common/Puppeteer';


import {
  ProtocolCommands,
  HostCommands,
  Message,
  WorkerCommands,
} from './types';

const protocolCommands = Object.keys(ProtocolCommands);

let browser: Browser | void;
let page: Page | void;
let client: CDPSession | void;

const sendParentMessage = (message: Message) => {
  // @ts-ignore
  self.postMessage(message);
};

// Override console so that messages show up in the browser's console
// Since we're in a webworker this won't disable console messages in
// the main app itself.
Object.keys(self.console).forEach((consoleMethod: keyof Console) => {
  // @ts-ignore
  self.console[consoleMethod] = (...args: SerializableOrJSHandle[]) => page && page.evaluate((consoleMethod: keyof Console, ...args) => {
    // @ts-ignore
    console[consoleMethod](...args);
  }, consoleMethod, ...args);
});

const start = async (data: Message['data']) => {
  const { browserWSEndpoint, quality = 100 } = data;

  const puppeter = new Puppeteer({ isPuppeteerCore: true });
  browser = await puppeter.connect({ browserWSEndpoint })
    .catch((error) => {
      console.error(error);
      return undefined;
    });

  if (!browser) {
    sendParentMessage({
      command: WorkerCommands.error,
      data: `⚠️ Couldn't establish a connection "${browserWSEndpoint}". Is your browser running?`,
    });
    return self.close();
  }

  browser.once('disconnected', () => {
    sendParentMessage({ command: WorkerCommands.browserClose, data: null });
    closeWorker();
  });
  page = await browser.newPage();
  page.pdf()
  client = await page.target().createCDPSession();

  await client.send('Page.startScreencast', { format: 'jpeg', quality });

  client.on('Page.screencastFrame', onScreencastFrame);

  sendParentMessage({
    command: WorkerCommands.startComplete,
    data: {
      targetId: page.target()._targetId,
    },
  });
};

const onScreencastFrame = ({ data, sessionId }: { data: string; sessionId: number }) => {
  if (client) {
    client.send('Page.screencastFrameAck', { sessionId }).catch(() => { });
    sendParentMessage({ command: WorkerCommands.screencastFrame, data });
  }
};

const setViewport = (data: { width: number, height: number, deviceScaleFactor: number }) => page && page.setViewport(data);

const runCode = async ({ code }: Message['data']) => {
  eval(code)({ page })
    .then(async (res: any) => sendParentMessage({
      command: WorkerCommands.runComplete,
      data: {
        url: (page as Page).url(),
        payload: res,
      },
    }))
    .catch((e: Error) => {
      page && page.evaluate((err) => console.error(err), e.toString());
    });
};

const closeWorker = async () => {
  if (browser) browser.disconnect();
  return self.close();
}

// Register Commands
self.addEventListener('message', async (message) => {
  const { command, data } = message.data as Message;

  if (command === HostCommands.start) {
    return start(data);
  }

  if (command === HostCommands.run) {
    return runCode(data);
  }

  if (command === HostCommands.setViewport) {
    return setViewport(data);
  }

  if (command === HostCommands.close) {
    return closeWorker();
  }

  if (protocolCommands.includes(command)) {
    if (!client) return;
    const protocolCommand = command as ProtocolCommands;
    return client.send(protocolCommand, data);
  }

  console.debug(`Unknown worker command:`, message);
}, false);

