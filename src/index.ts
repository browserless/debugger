import './index.css';
import { Editor } from './editor';
import { App } from './app';
import { Settings } from './settings';
import { Sessions } from './sessions';

const $editor = document.getElementById('code') as HTMLElement;
const $settings = document.getElementById('settings') as HTMLElement;
const $sessions = document.getElementById('sessions') as HTMLElement;

if (!$editor) {
  throw new Error(`Couldn't find element to insert code editor!`);
}

const editor = new Editor($editor);
const settings = new Settings($settings);
const sessions = new Sessions($sessions);

new App({ editor, settings, sessions });
