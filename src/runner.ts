import { debounce, once } from './util';

import {
  getConnectURL,
  getQuality,
} from './api';

import {
  ProtocolCommands,
  HostCommands,
  Message,
  WorkerCommands,
} from './types';

const runnerHTML = `
<div id="viewer">
  <canvas id="screencast"></canvas>
</div>`;

export class Runner {
  private puppeteerWorker: Worker;
  private $mount: HTMLElement;
  private $canvas: HTMLCanvasElement;
  private $viewer: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  private img = new Image();
  private started = false;

  static getModifiersForEvent(event: any) {
    // tslint:disable-next-line: no-bitwise
    return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
  }

  constructor () {
    this.$mount = document.querySelector('#runner') as HTMLElement;

    this.setupPuppeteerWorker();
  }

  onVerticalResize = (evt: MouseEvent) => {
    evt.preventDefault();

    this.$mount.style.pointerEvents = 'none';
    this.$viewer.style.flex = 'initial';

    let onMouseMove: any = (moveEvent: MouseEvent) => {
      if (moveEvent.buttons === 0) {
        return;
      }

      this.$viewer.style.height = `${moveEvent.clientY}px`;
      this.$canvas.height = moveEvent.clientY;
    };

    let onMouseUp: any = () => {
      this.$mount.style.pointerEvents = 'initial';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      onMouseMove = null;
      onMouseUp = null;
      this.resizePage();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  emitMouse = (evt: any) => {
    const buttons: any = { 0: 'none', 1: 'left', 2: 'middle', 3: 'right' };
    const event: any = evt.type === 'mousewheel' ? (window.event || evt) : evt;
    const types: any = {
      mousedown: 'mousePressed',
      mouseup: 'mouseReleased',
      mousewheel: 'mouseWheel',
      touchstart: 'mousePressed',
      touchend: 'mouseReleased',
      touchmove: 'mouseWheel',
      mousemove: 'mouseMoved',
    };

    if (!(event.type in types)) {
      return;
    }

    if (
      event.type !== 'mousewheel' &&
      buttons[event.which] === 'none' &&
      event.type !== 'mousemove'
    ) {
      return;
    }

    const type = types[event.type] as string;
    const isScroll = type.indexOf('wheel') !== -1;
    const x = isScroll ? event.clientX : event.offsetX;
    const y = isScroll ? event.clientY : event.offsetY;

    const data = {
      type: types[event.type],
      x,
      y,
      modifiers: Runner.getModifiersForEvent(event),
      button: event.type === 'mousewheel' ? 'none' : buttons[event.which],
      clickCount: 1
    };

    if (event.type === 'mousewheel') {
      // @ts-ignore
      data.deltaX = event.wheelDeltaX || 0;
      // @ts-ignore
      data.deltaY = event.wheelDeltaY || event.wheelDelta;
    }

    this.puppeteerWorker.postMessage({
      command: ProtocolCommands['Input.emulateTouchFromMouseEvent'],
      data,
    });
  };

  emitKeyEvent = (event: KeyboardEvent) => {
    let type;

    // Prevent backspace from going back in history
    if (event.keyCode === 8) {
      event.preventDefault();
    }

    switch (event.type) {
      case 'keydown':
        type = 'keyDown';
        break;
      case 'keyup':
        type = 'keyUp';
        break;
      case 'keypress':
        type = 'char';
        break;
      default:
        return;
    }

    const text = type === 'char' ? String.fromCharCode(event.charCode) : undefined;
    const data = {
      type,
      text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      keyIdentifier: (event as any).keyIdentifier,
      code: event.code,
      key: event.key,
      windowsVirtualKeyCode: event.keyCode,
      nativeVirtualKeyCode: event.keyCode,
      autoRepeat: false,
      isKeypad: false,
      isSystemKey: false
    };

    this.puppeteerWorker.postMessage({
      command: ProtocolCommands['Input.dispatchKeyEvent'],
      data,
    });
  };

  onScreencastFrame = (data: string) => {
    this.img.onload = () => this.ctx.drawImage(this.img, 0, 0, this.$canvas.width, this.$canvas.height);
    this.img.src = 'data:image/png;base64,' + data;
  };

  bindKeyEvents = () => {
    document.body.addEventListener('keydown', this.emitKeyEvent, true);
    document.body.addEventListener('keyup', this.emitKeyEvent, true);
    document.body.addEventListener('keypress', this.emitKeyEvent, true);
  };

  unbindKeyEvents = () => {
    document.body.removeEventListener('keydown', this.emitKeyEvent, true);
    document.body.removeEventListener('keyup', this.emitKeyEvent, true);
    document.body.removeEventListener('keypress', this.emitKeyEvent, true);
  };

  addListeners = () => {
    this.$canvas.addEventListener('mousedown', this.emitMouse, false);
    this.$canvas.addEventListener('mouseup', this.emitMouse, false);
    this.$canvas.addEventListener('mousewheel', this.emitMouse, false);
    this.$canvas.addEventListener('mousemove', this.emitMouse, false);

    this.$canvas.addEventListener('mouseenter', this.bindKeyEvents, false);
    this.$canvas.addEventListener('mouseleave', this.unbindKeyEvents, false);

    window.addEventListener('resize', this.resizePage);
  };

  removeEventListeners = () => {
    if (!this.started) return;
    this.$canvas.removeEventListener('mousedown', this.emitMouse, false);
    this.$canvas.removeEventListener('mouseup', this.emitMouse, false);
    this.$canvas.removeEventListener('mousewheel', this.emitMouse, false);
    this.$canvas.removeEventListener('mousemove', this.emitMouse, false);

    this.$canvas.removeEventListener('mouseenter', this.bindKeyEvents, false);
    this.$canvas.removeEventListener('mouseleave', this.unbindKeyEvents, false);

    window.removeEventListener('resize', this.resizePage);
  };

  resizePage = debounce(() => {
    const { width, height } = this.$viewer.getBoundingClientRect();

    this.$canvas.width = width - 5;
    this.$canvas.height = height;

    this.sendWorkerMessage({
      command: 'setViewport',
      data: {
        width: Math.floor(width),
        height: Math.floor(height),
        deviceScaleFactor: 1,
      }
    });
  }, 500);

  close = once(() => {
    this.sendWorkerMessage({ command: HostCommands.close, data: null });
    this.removeEventListeners();
    this.unbindKeyEvents();
  });

  sendWorkerMessage = (message: Message) => {
    this.puppeteerWorker.postMessage(message);
  };

  onWorkerSetupComplete = () => {
    this.started = true;
    this.$mount.innerHTML = runnerHTML;
    this.$viewer = document.querySelector('#viewer') as HTMLDivElement;
    this.$canvas = document.querySelector('#screencast') as HTMLCanvasElement;
    this.ctx = this.$canvas.getContext('2d') as CanvasRenderingContext2D;

    this.sendWorkerMessage({
      command: HostCommands.run,
      data: {
        url: 'https://www.google.com/',
      },
    });

    this.addListeners();
    this.resizePage();
  };

  setupPuppeteerWorker = () => {
    this.puppeteerWorker = new Worker('puppeteer.worker.bundle.js');
    this.puppeteerWorker.addEventListener('message', (evt) => {
      const { command, data } = evt.data as Message;

      if (command === WorkerCommands.startComplete) {
        return this.onWorkerSetupComplete();
      }

      if (command === WorkerCommands.screencastFrame) {
        return this.onScreencastFrame(data)
      }

      if (command === WorkerCommands.screencastFrame) {
        return this.onScreencastFrame(data)
      }

      if (command === WorkerCommands.browserClose) {
        return console.error(`browser has closed!`);
      }
    });

    this.puppeteerWorker.addEventListener('error', ({ message }) => {
      this.puppeteerWorker.terminate();
      return console.error(`browser has errored: ${message}!`);
    });

    this.sendWorkerMessage({
      command: 'start',
      data: {
        browserWSEndpoint: getConnectURL(),
        quality: getQuality(),
      },
    });
  };
}
