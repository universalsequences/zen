const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'library.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'zen', // Replace 'MyLibrary' with a name of your choice
    libraryTarget: 'umd', // Expose the library in various module formats, including as a global variable
    globalObject: 'this', // Ensure the library is accessible in various environments (Node.js and browsers)
  },
  optimization: {
    usedExports: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            passes: 2,
          },
          mangle: {
            reserved: ['cycle', 'accum'],
          },
          output: {
            beautify: false,
          },
        },
      }),
    ],
  },
};
