#!/usr/bin/env node

const { rwsShell, rwsPath } = require('@rws-framework/console');
const chalk = require('chalk');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const params = process.argv.splice(2);
let paramsString = params.length ? (' ' + params.join(' ')) : '';

const appRoot = process.cwd();
const rwsCliConfigDir = path.resolve(appRoot, 'node_modules', '.rws', 'cli');
const getCachedPath = (key) => path.resolve(rwsCliConfigDir, key);

const currentCwd = path.resolve(__dirname);

console.log({params})


const commandString = `npx webpack --config db.rws.webpack.config.js --output-path ./build ${process.cwd()} ${params[2]}`;
function needsCacheWarming(){

    if(!fs.existsSync(getCachedPath('paths')) || !fs.existsSync(getCachedPath('checksum'))){
        return true;
    }
    
    const fileList = fs.readFileSync(getCachedPath('paths'), 'utf-8').split('\n');    

    if(fileList.length){
        const fileContents = [];
        for(const filePath of fileList){
            if(fs.existsSync(filePath)){
                fileContents.push(fs.readFileSync(filePath, 'utf-8'));
            }
        }
        const finalMD5 = crypto.createHash('md5').update(fileContents.join('\n')).digest('hex');
        const cachedMD5 = fs.readFileSync(getCachedPath('checksum'), 'utf-8');

        if(finalMD5 === cachedMD5){            
            return false;
        }
    }        

    return true;
}

async function main()
{
    const hasRebuild = paramsString.split(' ').pop().indexOf('--rebuild') > -1;
    const doWarmCache = needsCacheWarming() || hasRebuild;  
    
    if(!((params[0] || false) && (params[1] || false) && (params[2] || false))){
        throw new Error(`CLI command MUST have 3 parameters: {DB_URL, DB_NAME, MODELS_DIR}`);
    }

    if(doWarmCache){
        console.log(chalk.yellow('[RWS DB CLI] Building CLI client...'));

        const cacheTypes = ['paths', 'checksum'];

        for(const type of cacheTypes){
            if(fs.existsSync(getCachedPath(type))){
                fs.unlinkSync(getCachedPath(type));
            }
        }

        await tsc();

        await rwsShell.runCommand(commandString, currentCwd);      
       
        
    }else{
        console.log(chalk.blue('[RWS CLI CACHE] Starting command from built CLI client.'));
    }    

    let startSlice = hasRebuild ? -1 : paramsString.split(' ').length;
    let endSlice = hasRebuild ? -1 : null ;

    paramsString = [
        ...paramsString.split(' ').slice(0, startSlice), 
        currentCwd, 
        endSlice ? 
            paramsString.split(' ').at(endSlice) 
        : null
    ].filter((item) => item !== null).join(' ');

    await rwsShell.runCommand(`node ${path.join(currentCwd, 'build', 'main.cli.rws.js')}${paramsString}`, process.cwd());
}

async function tsc (){
    const tempConfigContent = {
        "extends": "./tsconfig.json",
        "include": [
            path.join(process.cwd(), params[2], 'index.ts')
        ],           
    };
            
    const tempConfigPath = path.join(currentCwd, '.tmp.gitignore.json');
    fs.writeFileSync(tempConfigPath, JSON.stringify(tempConfigContent, null, 2));
    
    
    await rwsShell.runCommand(`tsc -p ${tempConfigPath}`, currentCwd);                
    fs.unlinkSync(tempConfigPath);        
}

main().then((data) => {
    console.log(chalk.green('[RWS DB CLI] Command complete.'));
}).catch((e) => {
    console.error(e.message);
});