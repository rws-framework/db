import { PrismaClient } from '@prisma/client';
import { Collection, Db, MongoClient } from 'mongodb';
import { ITimeSeries } from '../types/ITimeSeries';
import { IModel } from '../models/interfaces/IModel';
import { IDbConfigHandler } from '../types/DbConfigHandler';
import { IPaginationParams } from '../types/FindParams';
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
    constructor(configService: IDbConfigHandler);
    private connectToDB;
    reconnect(opts?: IDBClientCreate): void;
    static baseClientConstruct(dbUrl: string): MongoClient;
    createBaseMongoClient(): Promise<MongoClient>;
    createBaseMongoClientDB(): Promise<[MongoClient, Db]>;
    cloneDatabase(source: string, target: string): Promise<void>;
    watchCollection(collectionName: string, preRun: () => void): Promise<any>;
    insert(data: any, collection: string, isTimeSeries?: boolean): Promise<any>;
    update(data: any, collection: string, pk: string | string[]): Promise<IModel>;
    findOneBy(collection: string, conditions: any, fields?: string[] | null, ordering?: {
        [fieldName: string]: string;
    }): Promise<IModel | null>;
    delete(collection: string, conditions: any): Promise<void>;
    findBy(collection: string, conditions: any, fields?: string[] | null, ordering?: {
        [fieldName: string]: string;
    }, pagination?: IPaginationParams): Promise<IModel[]>;
    collectionExists(collection_name: string): Promise<boolean>;
    createTimeSeriesCollection(collection_name: string): Promise<Collection<ITimeSeries>>;
    private getCollectionHandler;
    private setOpts;
    count<T = any>(opModel: OpModelType<T>, where?: {
        [k: string]: any;
    }): Promise<number>;
    getPrismaClient(): PrismaClient;
}
export { DBService, IDBClientCreate };
