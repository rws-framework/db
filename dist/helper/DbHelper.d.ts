import { IDbConfigHandler, IDbConfigParams, IdGeneratorOptions } from '../types/DbConfigHandler';
import { IMetaOpts, OpModelType } from '../models/_model';
import { DBService } from '../services/DBService';
export declare class DbHelper {
    static dbUrlVarName: string;
    static installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    static generateId(dbType: IDbConfigParams['db_type'], options?: IdGeneratorOptions): string;
    static detectInstaller(): string;
    static pushDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    static generateModelSections(model: OpModelType<any>, configService: IDbConfigHandler): Promise<string>;
    static toConfigCase(modelType: IMetaOpts): string;
}
