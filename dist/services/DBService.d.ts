import { Collection, Db, MongoClient } from 'mongodb';
import { ITimeSeries } from '../types/ITimeSeries';
import { IModel } from '../models/interfaces/IModel';
import { IDbConfigHandler } from '../types/DbConfigHandler';
import { IPaginationParams } from '../types/FindParams';
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
    update(data: any, collection: string, compoundId?: {
        [key: string]: any;
    }): Promise<IModel>;
    findOneBy(collection: string, conditions: any, fields?: string[] | null, ordering?: {
        [fieldName: string]: string;
    }, allowRelations?: boolean): Promise<IModel | null>;
    delete(collection: string, conditions: any): Promise<void>;
    findBy(collection: string, conditions: any, fields?: string[] | null, ordering?: {
        [fieldName: string]: string;
    }, pagination?: IPaginationParams): Promise<IModel[]>;
    collectionExists(collection_name: string): Promise<boolean>;
    createTimeSeriesCollection(collection_name: string): Promise<Collection<ITimeSeries>>;
    private getCollectionHandler;
    private setOpts;
}
export { DBService, IDBClientCreate };
