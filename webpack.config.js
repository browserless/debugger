const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const srcDir = path.resolve(__dirname, 'src');
const outputDir = path.resolve(__dirname, 'static');

const main = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    app: path.join(srcDir, 'index.ts'),
    'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
    'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    globalObject: 'self',
    filename: '[name].bundle.js',
    path: outputDir,
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      },
      {
        test: /\.txt$/i,
        use: 'raw-loader',
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      title: 'browserless debugger',
      template: path.join(srcDir, 'index.html'),
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};

const worker = {
  target: 'webworker',
  mode: 'development',
  devtool: 'source-map',
  entry: {
    'puppeteer.worker': path.join(srcDir, 'puppeteer.worker.ts'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      fs: false,
      path: false,
      stream: require.resolve('stream-browserify'),
    },
  },
  output: {
    globalObject: 'self',
    filename: '[name].bundle.js',
    path: outputDir,
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};

module.exports = [main, worker];
