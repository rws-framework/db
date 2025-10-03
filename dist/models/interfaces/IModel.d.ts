import { IDbConfigHandler } from '../../types/DbConfigHandler';
import { DBService } from '../../services/DBService';
import { RWSModel } from '..';
export interface IModel {
    [key: string]: any;
    id: string | number | null;
    configService?: IDbConfigHandler;
    dbService?: DBService;
    save: () => Promise<this>;
    getDb: () => DBService;
    getCollection: () => string | null;
    reload: (inPostLoad: boolean) => Promise<RWSModel<any>>;
    delete: () => Promise<void>;
    hasTimeSeries: () => boolean;
    _asyncFill: (data: any, fullDataMode?: boolean, allowRelations?: boolean) => Promise<any>;
    preUpdate: () => Promise<void>;
    postUpdate: () => Promise<void>;
    preCreate: () => Promise<void>;
    postCreate: () => Promise<void>;
    postLoad: () => Promise<void>;
}
