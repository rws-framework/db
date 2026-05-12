import { Prisma, PrismaClient } from '@prisma/client';
import { IModel } from '../models/interfaces/IModel';
import { IDbConfigHandler } from '../types/DbConfigHandler';
import { IPaginationParams, OrderByType } from '../types/FindParams';
import { OpModelType } from '../models/interfaces/OpModelType';
interface IDBClientCreate {
    dbUrl?: string;
    dbName?: string;
}
declare class DBService {
    private configService;
    private client;
    private opts;
    private connected;
    private extensions;
    constructor(configService: IDbConfigHandler);
    addExtension(extension: Parameters<typeof Prisma.defineExtension>[0]): void;
    private connectToDB;
    reconnect(opts?: IDBClientCreate): void;
    insert(data: any, collection: string, isTimeSeries?: boolean): Promise<any>;
    update(data: any, collection: string, pk: string | string[]): Promise<IModel>;
    findOneBy(collection: string, conditions: any, fields?: string[] | null, ordering?: OrderByType, prismaOptions?: any): Promise<IModel | null>;
    delete(collection: string, conditions: any): Promise<void>;
    findBy(collection: string, conditions: any, fields?: string[] | null, ordering?: OrderByType, pagination?: IPaginationParams, prismaOptions?: any): Promise<IModel[]>;
    collectionExists(collection_name: string): Promise<boolean>;
    createTimeSeriesCollection(collection_name: string): Promise<void>;
    private getCollectionHandler;
    private convertOrderingToPrismaFormat;
    private setOpts;
    count<T = any>(opModel: OpModelType<T>, where?: {
        [k: string]: any;
    }): Promise<number>;
    getPrismaClient(): PrismaClient;
}
export { DBService, IDBClientCreate };
