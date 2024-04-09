const path = require('path')
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

/**
 * @returns {import('webpack').Configuration}
 */
module.exports = (_env, argv) => {
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production' || argv.mode === 'production';
  const dummyfilePath = path.resolve(__dirname, 'dummyfile');

  return {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(__dirname, 'src', 'index.ts'),
    target: "web",
    devtool: "source-map",
    output: {
      filename: 'c3exchange-sdk.min.js',
      path: path.join(__dirname, 'dist'),
      globalObject: 'this',
      library: {
        type: 'umd',
        name: 'C3Sdk'
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/u,
          include: path.resolve(__dirname, 'src'),
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.browser.json')
          }
        },
        {
          test: /\.js/u,
          type: 'javascript/auto',
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.json$/,
          type: 'json'
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.ts'],
      modules: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../../components'),
        path.resolve(__dirname, '../../node_modules'),
      ],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
        // "readable-stream": require.resolve('readable-stream'),
        url: require.resolve("url/"),
        fs: false,
      },
      // In order to reduce the bundle size, we need to remove the unused libraries
      // from the bundle. We can do it by replacing these unused libraries with a dummy file
      // that exports an empty object. This should not affect the functionality of the SDK.
      alias: {
        '@injectivelabs/sdk-ts': dummyfilePath,
        '@injectivelabs/networks':  dummyfilePath,
        '@injectivelabs/utils':   dummyfilePath,
        '@terra-money/terra.js':  dummyfilePath,
        '@terra-money/terra.proto':  dummyfilePath,
        '@terra-money/legacy.proto':  dummyfilePath,
        '@xpla/xpla.js':  dummyfilePath,
        'aptos':  dummyfilePath,
        '@mysten/sui.js':  dummyfilePath,
        'near-api-js':  dummyfilePath,
      }
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.DefinePlugin({
        //'process.env.COMMITHASH': JSON.stringify(gitRevisionPlugin.commithash()),
      }),
      new webpack.ProgressPlugin({ profile: false }),
      // Use only in LOCAL DEVELOPMENT. This will deploy a local server to show what is inside the bundle.
      // Including the dependencies and their sizes.
      // new BundleAnalyzerPlugin({
      //   analyzerMode: 'disabled',
      //   generateStatsFile: true,
      //   statsOptions: { source: false }
      // }),
    ],
    optimization: {
      minimize: true,
    },
    stats: {
      errorDetails: true
    }
  }
}
