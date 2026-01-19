const path = require('path');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'packed.js',
    path: path.resolve(__dirname, 'app'),
  },
  optimization: {
    minimize: false
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'app'),
    },
    client: {
      overlay: false
    },
    compress: true,
    port: 9000,
  },
};