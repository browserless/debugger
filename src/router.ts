let path = location.pathname;

// remove 'index.html'
if (path.endsWith('index.html')) {
  path = path.substring(0, path.length - 'index.html'.length);
}

// Always have a trailing slash
if (!path.endsWith('/')) {
  path += '/';
}

// Build the new URL with the original query string and hash
const newUrl = location.origin + path + location.search + location.hash;

// Only use pushState if the new URL is different to avoid unnecessary history entries
if (newUrl !== window.location.href) {
  window.history.pushState({}, '', newUrl);
}
