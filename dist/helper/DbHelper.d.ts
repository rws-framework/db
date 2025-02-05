import { IDbConfigHandler } from '../types/DbConfigHandler';
import { OpModelType } from '../models/_model';
import { DBService } from '../services/DBService';
export declare class DbHelper {
    static installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    static generateModelSections(model: OpModelType<any>): Promise<string>;
    static toConfigCase(modelType: any): string;
}
