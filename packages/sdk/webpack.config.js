const path = require('path')
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (_env, argv) => {
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production' || argv.mode === 'production';
  const dummyfilePath = path.resolve(__dirname, 'dummyfile');

  return {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(__dirname, 'src', 'index.ts'),
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/u,
          include: path.resolve(__dirname, 'src'),
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.browser.json')
          }
        },
        {
          test: /\.tsx?$/u,
          exclude: /node_modules/u
        },
        {
          test: /\.m?js/u,
          type: 'javascript/auto',
        },
        {
          test: /\.m?js/u,
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
      modules: ['node_modules', '../../components'],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
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
        '@project-serum/anchor':  dummyfilePath,
        'lodash':  dummyfilePath,
        /* The FE is failing by uncommenting these lines
        * // '@solana/web3.js':  dummyfilePath,
        * // '@solana/spl-token':  dummyfilePath,
        */ 
      }
    },
    target: "web",
    output: {
      filename: 'c3exchange-sdk.min.js',
      path: path.join(__dirname, 'dist'),
      globalObject: 'this',
      library: {
        type: 'umd',
        name: 'C3Sdk'
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
      // new BundleAnalyzerPlugin(),
    ],
    optimization: {
      minimize: true,
    },
    stats: {
      errorDetails: true
    }
  }
}
