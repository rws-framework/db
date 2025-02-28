import 'reflect-metadata';

const args: string[] = process.argv.slice(2).filter(cmd => cmd !== '--rebuild');
import fs from 'fs';
import path from 'path';
import { DbHelper, DBService, OpModelType, RWSModel } from '../../src';
import { IDbConfigHandler, IDbConfigParams } from '../../src/types/DbConfigHandler';
import chalk from 'chalk';

class Config implements IDbConfigHandler {
  private data: IDbConfigParams = {
    db_models: [],
    mongo_db: null,
    mongo_url: null
  };

  private modelsDir: string;
  private cliExecRoot: string;
  private static _instance: Config = null;

  private constructor(){}

  static async getInstance(): Promise<Config>
  {
    if(!this._instance){
      this._instance = new Config();
    }    

    await this._instance.fill();

    return this._instance;
  }

  
  async fill(): Promise<void>
  {
    this.data.mongo_url = args[0];
    this.data.mongo_db = args[1];    
    

    this.modelsDir = args[2];    
    this.cliExecRoot = args[3]; 

    console.log({args})

    // this.data.db_models = (await import('@V/index')).default;      
  }

  getModelsDir(): string
  {
    return this.modelsDir
  }

  getCliExecRoot(): string
  {
    return this.cliExecRoot
  }

  get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K] {
    return this.data[key];  
  }
}

async function main(): Promise<void>
{
  console.log('INSTALL PRISMA');
  const cfg = await Config.getInstance();
  DbHelper.installPrisma(cfg, new DBService(cfg), false);
}

console.log(chalk.bgGreen('[RWS DB CLI] Starting systems...'));

main();
