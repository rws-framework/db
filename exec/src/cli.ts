import 'reflect-metadata';

const args: string[] = process.argv.slice(2).filter(cmd => cmd !== '--rebuild');

import { IDbConfigHandler, IDbConfigParams } from '../../src/types/DbConfigHandler';
import chalk from 'chalk';
import { DbHelper } from '../../src/helper/DbHelper';
import { DBService } from '../../src/services/DBService';

class Config implements IDbConfigHandler {
  private data: IDbConfigParams = {
    db_models: [],
    db_name: null,
    db_url: null
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
    this.data.db_url = args[0];
    this.data.db_name = args[1];    
    this.data.db_type = args[2] as IDbConfigParams['db_type'];
    

    this.modelsDir = args[3];    
    this.cliExecRoot = args[4];     

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
  process.env.PRISMA_DB_URL = cfg.get('db_url');
  DbHelper.installPrisma(cfg, new DBService(cfg), false);
}

console.log(chalk.bgGreen('[RWS DB CLI] Starting systems...'));

main();
