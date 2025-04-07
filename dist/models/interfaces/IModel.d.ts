import { IDbConfigHandler } from '../../types/DbConfigHandler';
import { DBService } from '../../services/DBService';
export interface IModel {
    [key: string]: any;
    id: string | null;
    save: () => void;
    getDb: () => DBService;
    getCollection: () => string | null;
    configService?: IDbConfigHandler;
    dbService?: DBService;
}
