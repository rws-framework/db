const path = require('path');
const chalk = require('chalk');
const webpackFilters = require('./webpackFilters');
const webpack = require('webpack');
const { rwsPath } = require('@rws-framework/console');
// Get CLI arguments
const args = process.argv.slice(2);
const fs = require('fs');
const appRootPath = args[4] || process.cwd();
const modelsDir = args[5] || '';

const internalCwd = process.cwd()
const rootPackageNodeModules = path.resolve(rwsPath.findRootWorkspacePath(), 'node_modules');
const thisPackage = path.resolve(__dirname, '..');
const WEBPACK_PLUGINS = [new webpack.optimize.ModuleConcatenationPlugin()];

const modules_setup = [rootPackageNodeModules, appRootPath];
const isDev = true;

function prettyLog(data){
  for(const key of Object.keys(data)){
    const valObject = data[key];

    console.log(`${chalk.yellow('[Log]')} ${chalk.blue(key)}:`, valObject)
  }
}



const mainEntry = './' + path.relative(appRootPath, path.join(internalCwd, '/src/cli.ts'));
const vPath = path.relative(__dirname, path.join(__dirname, '../build/vendors'));

prettyLog({ buildPaths:{
  thisPackage,
  rootPackageNodeModules,
  appRootPath,
  internalCwd,
  vPath  
}});

if(!fs.existsSync(path.join(appRootPath, modelsDir, 'index.ts'))){
  console.log(`${chalk.red('[RWS Structure Error] ')} ${chalk.blue(`
    No index.ts in "${path.join(appRootPath, modelsDir)}"\n
    RWS DB requires "index.ts" that has default export with array of your models:\n

    ${chalk.blue('import')} RWSModel${chalk.blue(',')} OpModelType ${chalk.blue('from')}  ${chalk.green('./src/models/user.model.ts')}${chalk.blue(';')}

    RWSModel<ModelDataInterface> is instance type and
    OpModelType<ModelDataInterface> is type for static methods that navigate through db to populate instanced models.`)}\n
     
    Example: \n

    ${chalk.blue('import')} User ${chalk.blue('from')} ${chalk.green('\'./src/models/user.model.ts\'')}${chalk.blue(';')}
    ${chalk.blue('import')} ApiKey ${chalk.blue('from')} ${chalk.green('\'./src/models/apiKey.model.ts\'')}${chalk.blue(';')}

    ${chalk.blue('export')} default ${chalk.magenta('[')}
      User${chalk.blue(',')}
      ApiKey
    ${chalk.magenta(']')}${chalk.blue(';')}
  `);

  throw new Error("Build stopped.")
}

const cfgExport = {
  context: appRootPath,
  entry: mainEntry,
  mode: isDev ? 'development' : 'production',
  target: 'node',
  devtool: isDev ? 'source-map' : false,
  output: {
    path: path.resolve(internalCwd, 'build'), // Resolve output path relative to config directory
    filename: '[name].cli.rws.js',
    sourceMapFilename: '[file].map',
    chunkFilename: "[name].chunk.js",
    libraryTarget: 'commonjs2',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.js'],
    modules: modules_setup,
    alias: {       
      '@V': vPath,
      'src': path.resolve(appRootPath, 'src'), // Add explicit resolution for src directory
    },    
    fallback: {
      "kerberos": false,
      "mongodb-client-encryption": false
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts)$/,
        use: [                       
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json'),
              compilerOptions: {
                outDir: path.resolve(internalCwd, 'build'),       
              }             
            }
          }
        ],
        include: [
          path.resolve(appRootPath),
          path.resolve(thisPackage),
          path.resolve(rootPackageNodeModules, '@rws-framework')                
        ],
        exclude: [
          /node_modules\/(?!(@rws-framework)\/).*/,
          /\.d\.ts$/
        ]
      },       
      {
        test: /\.node$/,
        use: 'node-loader',
      }        
    ],
  },
  plugins: [
    ...WEBPACK_PLUGINS,
    new webpack.DefinePlugin({
      'process.env.APP_ROOT': JSON.stringify(appRootPath),
      'process.env.DB_CLI': JSON.stringify(1)
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^kerberos$/,
    }),
    new webpack.NormalModuleReplacementPlugin(
      /.*\/build\/Debug\/kerberos\.node$/,
      '@rws-framework/db/src/empty.js'
    )
  ],
  ignoreWarnings: webpackFilters,
  optimization: {      
    minimize: false
  },
  experiments: {
    topLevelAwait: true, // Enable top-level await if needed
  }  
  // stats: 'verbose'

};

cfgExport.externals = {
  '@nestjs/common': 'commonjs @nestjs/common',
  '@nestjs/core': 'commonjs @nestjs/core',  
  '@nestjs/config': 'commonjs @nestjs/config',  
  '@anthropic-ai/sdk': 'commonjs @anthropic-ai/sdk',
  '@zip.js/zip.js': 'commonjs @zip.js/zip.js',
  'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
  'uuid': 'commonjs uuid',
  'source-map-support': 'commonjs source-map-support'
};

cfgExport.plugins.push(
  new webpack.BannerPlugin({
    banner: 'require("source-map-support").install();',
    raw: true
  })
);

// console.log('Final config', cfgExport);

module.exports = cfgExport;
