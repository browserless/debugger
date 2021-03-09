import { fetchSessions, getDevtoolsInspectorURL } from './api';

const sessionsHTML = `
<button id="close-sessions">
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
</button>
<h2>Current Sessions</h2>
<ol id="sessions-viewer">
</ol>`;

export class Sessions {
  private onCloseHandler = () => {};
  private $mount: HTMLElement;
  private $list: HTMLElement;
  private interval: ReturnType<Window['setInterval']>

  constructor($mount: HTMLElement) {
    this.$mount = $mount;
    this.$mount.innerHTML = sessionsHTML;
    this.$list = document.querySelector('#sessions-viewer') as HTMLElement;

    this.addListeners();
  }

  addListeners = () => {
    document.querySelector('#close-sessions')?.addEventListener('click', this.onCloseClick);
  };

  removeListeners = () => {
    document.querySelector('#close-sessions')?.removeEventListener('click', this.onCloseClick);
    window.clearInterval(this.interval);
  };

  onCloseClick = () => {
    this.onCloseHandler();
  };

  toggleVisibility = (visible?: boolean) => {
    const display = (() => {
      if (typeof visible === 'boolean') {
        return visible ? 'flex' : 'none';
      }
      return this.$mount.style.display === 'flex' ? 'none' : 'flex';
    })();

    this.$mount.style.display = display;

    if (display === 'flex') {
      this.getSessions();
      this.interval = window.setInterval(this.getSessions, 2500);
    } else {
      window.clearInterval(this.interval);
    }
  }

  getSessions = async () => {
    const links = (await fetchSessions())
      .filter((s: any) => s.url !== 'about:blank')
      .map((s: any) =>`<li><a href="${getDevtoolsInspectorURL(s.id)}" target="_blank" rel="noopener noreferrer nofollow">${s.title}</a></li>`)
      .join('\n');

    this.$list.innerHTML = links;
  };

  onClose = (handler: () => void) => this.onCloseHandler = handler;
}
