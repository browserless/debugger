import * as monaco from 'monaco-editor';
import { get, set } from './storage';
import {
  screenshotExample,
  pdfExample,
  scrapeExample,
  blankExample,
  searchExample,
} from './constants';
const nodeTypes = (require as any).context('!!raw-loader!@types/node/', true, /\.d.ts$/);
const puppeteerTypes = require('!!raw-loader!puppeteer-core/lib/types.d.ts');

interface tabs {
  tabName: string;
  code: string;
  active: boolean;
}

export class Editor {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private $tabs = document.querySelector('#editor-tabs') as HTMLOListElement;

  static storageKey = 'editorTabs';
  static closeButtonSelector = 'close-btn';
  static dataTabCode = 'data-tab-code';
  static activeTabClass = 'active';
  static defaultTabs: Array<tabs> = [{
    tabName: 'Search',
    code: searchExample,
    active: true,
  }, {
    tabName: 'Scrape',
    code: scrapeExample,
    active: false,
  }, {
    tabName: 'PDF',
    code: pdfExample,
    active: false,
  }, {
    tabName: 'Screenshot',
    code: screenshotExample,
    active: false,
  }];

  constructor($editor: HTMLElement) {
    const priorState = (get(Editor.storageKey) as tabs[] | null || Editor.defaultTabs);

    const editorCode: string = priorState.reduce((prev, { tabName, code, active }) => {
      const tab = document.createElement('li');
      const closeButton = this.createCloseButton();

      if (priorState.length === 1) {
        closeButton.setAttribute('disabled', 'true');
      }

      tab.onclick = this.setTabActive;
      tab.className = active ? Editor.activeTabClass : '';
      tab.innerHTML = tabName;
      tab.setAttribute(Editor.dataTabCode, code);
      tab.appendChild(closeButton);

      this.$tabs.appendChild(tab);

      return active ? code : prev;
    }, screenshotExample);

    const createTabEl = document.createElement('li');
    createTabEl.className = `create`;
    createTabEl.onclick = this.addTab;

    this.$tabs.appendChild(createTabEl);

    this.setupEditor($editor, editorCode);
  };

  saveState = () => {
    const tabs = this.getTabs();
    const value = this.editor.getValue();
    const activeTab = this.getActiveTab();
    activeTab?.setAttribute(Editor.dataTabCode, value);

    const state = tabs.map((tab) => ({
      tabName: tab.innerText.trim(),
      code: tab.getAttribute(Editor.dataTabCode),
      active: tab.className.includes(Editor.activeTabClass),
    }));

    set(Editor.storageKey, state);
  };

  getActiveTab = () => document.querySelector(`#editor-tabs li.${Editor.activeTabClass}`);

  // @ts-ignore make array hack
  getTabs = (): HTMLElement[] => [...document.querySelectorAll('#editor-tabs li:not(.create)')];

  clearActiveTabs = () => {
    const tabs = this.getTabs();
    tabs.forEach(t => t.className = '');
  };

  createCloseButton = () => {
    const closeButton = document.createElement('button');

    closeButton.className = Editor.closeButtonSelector;
    closeButton.onclick = this.removeTab;

    return closeButton;
  };

  onAddTabComplete = (evt: FocusEvent) => {
    const tab = evt.target as HTMLElement;
    tab.contentEditable = 'false';
  };

  addTab = () => {
    const tabs = this.getTabs();
    const tab = document.createElement('li');
    const closeButton = this.createCloseButton();
    tab.innerText = 'My-Script';
    tab.contentEditable = 'true';

    tab.onclick = this.setTabActive;
    tab.setAttribute(Editor.dataTabCode, blankExample);
    tab.className = Editor.activeTabClass;
    tab.onblur = this.onAddTabComplete;
    tab.appendChild(closeButton);

    tabs.forEach((t) => t.querySelector('.' + Editor.closeButtonSelector)?.removeAttribute('disabled'));
    this.clearActiveTabs();
    this.$tabs.prepend(tab);
    this.editor.setValue(blankExample);
    tab.focus();
    document.execCommand('selectAll', false);
  };

  removeTab = (evt: MouseEvent) => {
    evt.stopPropagation();
    const tab = (evt.target as HTMLElement).parentNode as HTMLElement;
    tab.parentElement?.removeChild(tab);

    const tabs = this.getTabs();

    if (tabs.length === 1) {
      const [lastTab] = tabs;
      lastTab.querySelector('.' + Editor.closeButtonSelector)?.setAttribute('disabled', 'true');
    }

    if (tab.className.includes(Editor.activeTabClass)) {
      const nextTab = tabs.find(t => t !== tab);

      if (nextTab) {
        nextTab.className = Editor.activeTabClass;
        this.editor.setValue(nextTab.getAttribute(Editor.dataTabCode) || screenshotExample);
      }
      return;
    }

    this.saveState();
  };

  setTabActive = (evt: MouseEvent) => {
    this.clearActiveTabs();
    const tab = evt.target as HTMLElement;
    const code = tab.getAttribute(Editor.dataTabCode);
    tab.className = Editor.activeTabClass;
    this.editor.setValue(code || '');
  };

  public async getCompiledCode() {
    await new Promise((r) => setTimeout(r, 1000));
    const model = this.editor.getModel();
    if (!model) {
      throw new Error(`Couldn't successfully load editor's contents`);
    }
    const { uri } = model;
    const worker = await monaco.languages.typescript.getTypeScriptWorker();
    const client = await worker(uri);
    const result = await client.getEmitOutput(uri.toString());
    const [{ text }] = result.outputFiles;

    return text;
  }

  private setupEditor($editor: HTMLElement, initialCode: string) {
    // @ts-ignore
    self.MonacoEnvironment = {
      getWorkerUrl: (_moduleId: any, label: string) => {
        if (label === 'typescript' || label === 'javascript') {
          return './ts.worker.bundle.js';
        }
        return './editor.worker.bundle.js';
      }
    };

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
    });

    nodeTypes.keys().forEach((key: string) => {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        nodeTypes(key).default,
        'node_modules/@types/node/' + key.substring(2)
      );
    });

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      puppeteerTypes.default
        .replace('import { ChildProcess } from \'child_process\';', '')
        .replace(`import { Protocol } from 'devtools-protocol';`, '')
        .replace(`import { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';`, '')
        .replace(`import type { Readable } from 'stream';`, '')
        .replace(/export /g, 'declare '),
      'node_modules/@types/puppeteer/index.d.ts',
    );

    this.editor = monaco.editor.create($editor, {
      value: initialCode,
      language: 'typescript',
      theme: 'vs-dark',
      fontSize: 14,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      minimap: {
        enabled: false
      }
    });

    this.editor.onDidChangeModelContent(this.saveState);
  }
}
