import {
  getWebSocketURL,
  getHeadless,
  getStealth,
  getAds,
  getIgnoreHTTPS,
  setBrowserURL,
  setHeadless,
  setStealth,
  setAds,
  setIgnoreHTTPS,
  getQuality,
  setQuality,
} from './api';

const settingsHTML = `
<button id="close-settings">
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
</button>
<form spellcheck="false">
  <h2>Debugger Settings</h2>
  <div class="form-input">
    <label for="websocket-endpoint">Browser URL</label>
    <input id="websocket-endpoint" type="url" />
  </div>

  <div class="form-input">
    <label for="screencast-quality">Quality</label>
    <p class="form-descriptor">The quality of the video stream (100 is best, 0 is worst but less data.)</p>
    <input id="screencast-quality" type="number" min="0" max="100"/>
  </div>

  <div class="form-input">
    <label for="chrome-flags">Flags</label>
    <textarea id="chrome-flags" placeholder="--disable-breakpad --disable-crash-reporter=true"></textarea>
  </div>

  <div class="form-checkbox">
    <input id="ignore-https" type="checkbox" />
    <label for="ignore-https">Ignore HTTPS Errors</label>
  </div>

  <div class="form-checkbox">
    <input id="headless" type="checkbox" />
    <label for="headless">Headless</label>
  </div>

  <div class="form-checkbox">
    <input id="stealth" type="checkbox" />
    <label for="stealth">Stealth</label>
  </div>

  <div class="form-checkbox">
    <input id="block-ads" type="checkbox" />
    <label for="block-ads">Block Ads</label>
  </div>
</form>`;

export class Settings {
  private onCloseHandler = () => {};

  private $mount: HTMLElement;
  private $browserInput: HTMLInputElement;
  private $headlessInput: HTMLInputElement;
  private $stealthInput: HTMLInputElement;
  private $blockAdsInput: HTMLInputElement;
  private $ignoreHTTPSInput: HTMLInputElement;
  private $screencastQuality: HTMLInputElement;

  constructor($mount: HTMLElement) {
    this.$mount = $mount;
    this.$mount.innerHTML = settingsHTML;

    this.$browserInput = document.querySelector('#websocket-endpoint') as HTMLInputElement;
    this.$headlessInput = document.querySelector('#headless') as HTMLInputElement;
    this.$ignoreHTTPSInput = document.querySelector('#ignore-https') as HTMLInputElement;
    this.$stealthInput = document.querySelector('#stealth') as HTMLInputElement;
    this.$blockAdsInput = document.querySelector('#block-ads') as HTMLInputElement;
    this.$screencastQuality = document.querySelector('#screencast-quality') as HTMLInputElement;

    this.hydrate();
    this.addListeners();
  }

  hydrate = () => {
    this.$browserInput.value = getWebSocketURL().href;
    this.$headlessInput.checked = getHeadless()
    this.$ignoreHTTPSInput.checked = getIgnoreHTTPS();
    this.$stealthInput.checked = getStealth();
    this.$blockAdsInput.checked = getAds();
    this.$screencastQuality.value = getQuality().toString();
  };

  addListeners = () => {
    document.querySelector('#close-settings')?.addEventListener('click', this.onCloseClick);
    this.$browserInput.addEventListener('change', this.onBrowserInputChange);
    this.$blockAdsInput.addEventListener('change', this.onBlockAdsInputChange);
    this.$headlessInput.addEventListener('change', this.onHeadlessInputChange);
    this.$ignoreHTTPSInput.addEventListener('change', this.onIgnoreHTTPSInputChange);
    this.$stealthInput.addEventListener('change', this.onStealthInputChange);
    this.$screencastQuality.addEventListener('change', this.onScreencastQualityChange);
  };

  removeListeners = () => {
    document.querySelector('#close-settings')?.removeEventListener('click', this.onCloseClick);
    this.$browserInput.removeEventListener('change', this.onBrowserInputChange);
    this.$blockAdsInput.removeEventListener('change', this.onBlockAdsInputChange);
    this.$headlessInput.removeEventListener('change', this.onHeadlessInputChange);
    this.$ignoreHTTPSInput.removeEventListener('change', this.onIgnoreHTTPSInputChange);
    this.$stealthInput.removeEventListener('change', this.onStealthInputChange);
    this.$screencastQuality.removeEventListener('change', this.onScreencastQualityChange);
  };

  onCloseClick = () => {
    this.onCloseHandler();
  };

  onScreencastQualityChange = (evt: Event) => {
    const val = (evt.target as HTMLInputElement).value;
    setQuality(+val);
  };

  onBlockAdsInputChange = (evt: Event) => {
    const checked = (evt.target as HTMLInputElement).checked;
    setAds(checked);
  };

  onHeadlessInputChange = (evt: Event) => {
    const checked = (evt.target as HTMLInputElement).checked;
    setHeadless(checked);
  };

  onIgnoreHTTPSInputChange = (evt: Event) => {
    const checked = (evt.target as HTMLInputElement).checked;
    setIgnoreHTTPS(checked);
  };

  onStealthInputChange = (evt: Event) => {
    const checked = (evt.target as HTMLInputElement).checked;
    setStealth(checked);
  };

  onClose = (handler: () => void) => this.onCloseHandler = handler;

  toggleVisibility = (visible?: boolean) => {
    const display = (() => {
      if (typeof visible === 'boolean') {
        return visible ? 'flex' : 'none';
      }
      return this.$mount.style.display === 'flex' ? 'none' : 'flex';
    })();

    this.$mount.style.display = display;
  };

  onBrowserInputChange = (evt: Event) => {
    const $input = evt.target as HTMLInputElement
    const text = $input.value;
    const { valid, message } = setBrowserURL(text);
    
    if (!valid) {
      this.$browserInput.title = message;
      this.$browserInput.classList.add('error');
      return;
    }

    this.$browserInput.title = 'Sets a WebSocket URL to run your sessions on.';
    this.$browserInput.classList.remove('error');
  };
}
