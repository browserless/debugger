import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { Editor } from './editor';
import { Runner } from './runner';
import { indexCode } from './constants';
import { Settings } from './settings';
import { Sessions } from './sessions';

const packageJSON = require('puppeteer-core/package.json');

const README = `# Browserless Starter-pack
This simple starter-pack gets you up and running with all the code you used in the debugger. Just install and run!

## Requirements
- NodeJS (version 12 or higher).
- An environment to run command's (Terminal or others).

## Running
1. NodeJS >= 12 is installed
2. 'npm install'
3. 'npm start'
`;

const getPackageJson = () => `{
  "name": "browserless-export",
  "description": "Exported package from browserless, ready to go!",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "puppeteer-core": "${packageJSON.version}"
  }
}`;

export class App {
  private editor: Editor;
  private settings: Settings;
  private sessions: Sessions;

  private $editorButton = document.querySelector('#editor-button-radio') as HTMLInputElement;
  private $runButton = document.querySelector('#run-button') as HTMLElement;
  private $runnerMount = document.querySelector('#runner') as HTMLElement;
  private $editorPanel = document.querySelector('#editor') as HTMLElement;
  private $horizontalResizer = document.querySelector('#resize-main') as HTMLDivElement;
  private $download = document.querySelector('#download') as HTMLElement;
  private $radioButtons = [...(document.querySelectorAll('#side-nav input[type=radio]') as any)];

  private runner: Runner | null;
  private offsetLeft = document.querySelector('#side-nav')?.getBoundingClientRect().width as number | 0;

  constructor (
    { editor, settings, sessions }:
    { editor: Editor, settings: Settings, sessions: Sessions }
  ) {
    this.editor = editor;
    this.settings = settings;
    this.sessions = sessions;

    this.settings.onClose(this.onPanelClose);
    this.sessions.onClose(this.onPanelClose);

    this.$runButton.addEventListener('click', this.run);
    this.$download.addEventListener('click', this.download);
    this.$radioButtons.forEach((el) => el.addEventListener('change', this.onPanelChange));

    this.addEventListeners();
  }

  onPanelClose = () => {
    this.$editorButton.checked = true;
    this.onPanelChange();
  };

  onPanelChange = () => {
    const selectedPanel = document.querySelector('#side-nav input[type=radio]:checked') as HTMLInputElement;
    const openPanel = selectedPanel ? selectedPanel.value : 'editor';

    if (openPanel === 'settings') {
      this.sessions.toggleVisibility(false);
      this.settings.toggleVisibility(true);
    }

    if (openPanel === 'sessions') {
      this.settings.toggleVisibility(false);
      this.sessions.toggleVisibility(true);
    }

    if (openPanel === 'editor') {
      this.settings.toggleVisibility(false);
      this.sessions.toggleVisibility(false);
    }
  };

  addEventListeners = () => {
    this.$horizontalResizer.addEventListener('mousedown', this.onHorizontalResize);
  };

  removeEventListeners = () => {
    this.$horizontalResizer.removeEventListener('mousedown', this.onHorizontalResize);
  };

  download = async () => {
    const packageJson = getPackageJson();
    const startJS = await this.editor.getCompiledCode();
    const zip = new JSZip();

    zip.file('index.js', indexCode);
    zip.file('start.js', startJS);
    zip.file('package.json', packageJson);
    zip.file('README.md', README);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `browserless-project.zip`);
  };

  onHorizontalResize = (evt: MouseEvent) => {
    evt.preventDefault();

    this.$runnerMount.style.pointerEvents = 'none';

    let onMouseMove: any = (moveEvent: MouseEvent) => {
      if (moveEvent.buttons === 0) return;

      const posX = moveEvent.clientX - this.offsetLeft;
      const fromRight = window.innerWidth - posX;

      this.$editorPanel.style.width = `${posX}px`;
      this.$runnerMount.style.width= `${fromRight}px`;
    };

    let onMouseUp: any = () => {
      this.$runnerMount.style.pointerEvents = 'initial';
      this.runner?.resizePage();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      onMouseMove = null;
      onMouseUp = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  onRunnerComplete = (showMessage = true) => {
    this.runner = null;

    if (showMessage) {
      this.$runnerMount.innerHTML = `
      ${this.$runnerMount.innerHTML}
      <div class="fixed-message">
        <code>Session complete. Click ► to run your code again.</code>
      </div>
      `;
    }
  };

  run = async () => {
    if (this.runner) {
      this.runner.close(false);
    }
    const code = await this.editor.getCompiledCode();
    const $mount = this.$runnerMount;
    const onClose = this.onRunnerComplete;

    this.runner = new Runner({ code, $mount, onClose });
  };
}
