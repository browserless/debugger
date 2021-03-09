# Browserless Debugger

This is the repository for the web-ui client of browserless. The application is written in TypeScript, and produces a static asset in the `static` directory once built.
 
Currently this uses native DOM APIs for rendering, as well as the wonderful monaco editor library. 

## Installation

1. Ensure that NodeJS and npm are installed in your system: `node -v` shouldn't error.
2. Clone this repo: `git clone https://github.com/browserless/debugger.git debugger && cd debugger`
3. `npm install`
4. `npm run build` for the production build
5. `npm run dev` for the live dev environment. You'll want to serve your static assets from `static` with another web-server (we use http-server).

More coming soon...
