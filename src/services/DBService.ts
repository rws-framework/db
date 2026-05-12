import { Prisma, PrismaClient } from '@prisma/client';
import { InputJsonObject, JsonObject } from '@prisma/client/runtime/library';
import { Db, MongoClient } from 'mongodb';

type ExtendedPrismaClient = PrismaClient | ReturnType<PrismaClient['$extends']>;
import { IModel } from '../models/interfaces/IModel';
import chalk from 'chalk';
import { IDbConfigHandler } from '../types/DbConfigHandler';
import { IPaginationParams, OrderByType, OrderByField, OrderByArray } from '../types/FindParams';
import { OpModelType } from '../models/interfaces/OpModelType';
import { ModelUtils } from '../models/utils/ModelUtils';

interface IDBClientCreate {
    dbUrl?: string;
    dbName?: string;
}

class DBService {
    private client: ExtendedPrismaClient;
    private opts: IDBClientCreate = null;
    private connected = false;
    private extensions: ReturnType<typeof Prisma.defineExtension>[] = [];

    constructor(private configService: IDbConfigHandler) { }

    addExtension(extension: Parameters<typeof Prisma.defineExtension>[0]): void {
        const extName = (extension as { name?: string }).name;
        if(extName && this.extensions.some(ext => (ext as { name?: string }).name === extName)) {
            console.warn(chalk.yellow(`Extension with name ${extName} already exists. Skipping.`));
            return;
        }
        this.extensions.push(Prisma.defineExtension(extension));
        if (this.connected) {
            this.reconnect();
        }
    }

    private connectToDB(opts: IDBClientCreate = null) {
        if (opts) {
            this.opts = opts;
        } else {
            this.opts = {
                dbUrl: this.configService.get('db_url'),
                dbName: this.configService.get('db_name'),
            };
        }

        if (!this.opts.dbUrl) {
            console.log(chalk.red('No database config set in @rws-framework/db'));

            return;
        }

        try {
            let theClient: ExtendedPrismaClient = new PrismaClient({
                datasourceUrl: this.opts.dbUrl,
            });

            for (const ext of this.extensions) {
                theClient = (theClient as PrismaClient).$extends(ext) as ReturnType<PrismaClient['$extends']>;
            }

            console.log('DB EXTENSIONS: ', this.extensions.length)

            this.client = theClient;

            this.connected = true;
        } catch (e: Error | any) {
            console.error(e);

            throw new Error('PRISMA CONNECTION ERROR');
        }
    }

    reconnect(opts: IDBClientCreate = null) {
        this.connectToDB(opts);
    }

    static baseClientConstruct(dbUrl: string): MongoClient {
        const client = new MongoClient(dbUrl);

        return client;
    }

    public async createBaseMongoClient(): Promise<MongoClient> {
        const dbUrl = this.opts?.dbUrl || this.configService.get('db_url');
        const client = DBService.baseClientConstruct(dbUrl);

        await client.connect();

        return client;

    }

    public async createBaseMongoClientDB(): Promise<[MongoClient, Db]> {
        const dbName = this.opts?.dbName || this.configService.get('db_name');
        const client = await this.createBaseMongoClient();
        return [client, client.db(dbName)];
    }

    public async cloneDatabase(source: string, target: string): Promise<void> {
        const client = await this.createBaseMongoClient();

        // Source and target DB
        const sourceDb = client.db(source);
        const targetDb = client.db(target);

        // Get all collections from source DB
        const collections = await sourceDb.listCollections().toArray();

        // Loop over all collections and copy them to the target DB
        for (const collection of collections) {
            const docs = await sourceDb.collection(collection.name).find({}).toArray();
            await targetDb.collection(collection.name).insertMany(docs);
        }

        await client.close();
    }

    async watchCollection(collectionName: string, preRun: () => void): Promise<any> {
        const [client, db] = await this.createBaseMongoClientDB();
        const collection = db.collection(collectionName);

        const changeStream = collection.watch();
        return new Promise((resolve) => {
            changeStream.on('change', (change) => {
                resolve(change);
            });

            preRun();
        });
    }

    async insert(data: any, collection: string, isTimeSeries: boolean = false) {

        let result: any = data;
        // Insert time-series data outside of the transaction

        if (isTimeSeries) {
            const prisma = this.getPrismaClient();
            const insertResult = await (prisma as unknown as { $runCommandRaw(cmd: InputJsonObject): Promise<JsonObject> }).$runCommandRaw({
                insert: collection,
                documents: [data]
            });

            const insertedId = (insertResult as { insertedIds?: Record<string, unknown> }).insertedIds?.[0]?.toString() ?? data.id;
            result = await this.findOneBy(collection, { id: insertedId });
            return result;
        }

        const prismaCollection = this.getCollectionHandler(collection);

        result = await prismaCollection.create({ data });

        return await this.findOneBy(collection, { id: result.id });
    }

    async update(data: any, collection: string, pk: string | string[]): Promise<IModel> {

        const prismaCollection = this.getCollectionHandler(collection);


        const where: any = {};

        if (Array.isArray(pk)) {
            for (const pkElem of pk) {
                where[pkElem] = data[pkElem];
            }
        } else {
            where[pk as string] = data[pk as string]
        }

        if (!Array.isArray(pk)) {
            delete data[pk];
        } else {
            for (const cKey in pk) {
                delete data[cKey];
            }
        }

        await prismaCollection.update({
            where,
            data,
        });


        return await this.findOneBy(collection, where);
    }


    async findOneBy(collection: string, conditions: any, fields: string[] | null = null, ordering: OrderByType = null, prismaOptions: any = null): Promise<IModel | null> {
        const params: any = { where: conditions };

        if (fields) {
            params.select = {};
            fields.forEach((fieldName: string) => {
                params.select[fieldName] = true;
            });

            // Add relation fields to select instead of using include when fields are specified
            if (prismaOptions?.include) {
                Object.keys(prismaOptions.include).forEach(relationField => {
                    if (fields.includes(relationField)) {
                        params.select[relationField] = true;
                    }
                });
            }
        } else if (prismaOptions?.include) {
            // Only use include when no fields are specified
            params.include = prismaOptions.include;
        }

        if (ordering) {
            params.orderBy = this.convertOrderingToPrismaFormat(ordering);
        }

        const retData = await this.getCollectionHandler(collection).findFirst(params);

        return retData;
    }

    async delete(collection: string, conditions: any): Promise<void> {
        await this.getCollectionHandler(collection).deleteMany({ where: conditions });
        return;
    }

    async findBy(
        collection: string,
        conditions: any,
        fields: string[] | null = null,
        ordering: OrderByType = null,
        pagination: IPaginationParams = null,
        prismaOptions: any = null): Promise<IModel[]> {
        const params: any = { where: conditions };

        if (fields) {
            params.select = {};
            fields.forEach((fieldName: string) => {
                params.select[fieldName] = true;
            });

            // Add relation fields to select instead of using include when fields are specified
            if (prismaOptions?.include) {
                Object.keys(prismaOptions.include).forEach(relationField => {
                    if (fields.includes(relationField)) {
                        params.select[relationField] = true;
                    }
                });
            }
        } else if (prismaOptions?.include) {
            // Only use include when no fields are specified
            params.include = prismaOptions.include;
        }

        if (ordering) {
            params.orderBy = this.convertOrderingToPrismaFormat(ordering);
        }

        if (pagination) {
            const perPage = pagination.per_page || 50;
            params.skip = (pagination.page || 0) * perPage;
            params.take = perPage;
        }                

        const retData = await this.getCollectionHandler(collection).findMany(params);

        return retData;
    }

    async collectionExists(collection_name: string): Promise<boolean> {
        try {
            const prisma = this.getPrismaClient();
            const result = await (prisma as unknown as { $runCommandRaw(cmd: InputJsonObject): Promise<JsonObject> }).$runCommandRaw({
                listCollections: 1,
                filter: { name: collection_name },
                nameOnly: true
            });

            const batch = (result as { cursor?: { firstBatch?: unknown[] } }).cursor?.firstBatch;
            return (batch?.length ?? 0) > 0;
        } catch (error) {
            console.error('Error checking MongoDB collection:', error);
            throw error;
        }
    }

    async createTimeSeriesCollection(collection_name: string): Promise<void> {
        try {
            const prisma = this.getPrismaClient();
            await (prisma as unknown as { $runCommandRaw(cmd: InputJsonObject): Promise<JsonObject> }).$runCommandRaw({
                create: collection_name,
                timeseries: {
                    timeField: 'timestamp',
                    metaField: 'params'
                }
            });
        } catch (error) {
            console.error('Error creating MongoDB time series collection:', error);
            throw error;
        }
    }

    private getCollectionHandler(collection: string): any {
        if (!this.client || !this.connected) {
            this.connectToDB();
        }

        return Reflect.get(this.client, collection);
    }

    private convertOrderingToPrismaFormat(ordering: OrderByType): any {
        if (!ordering) {
            return null;
        }

        // If it's already an array, return as is (but handle null values for booleans)
        if (Array.isArray(ordering)) {
            return ordering;
        }

        // If it's a single object, convert to array format
        return [ordering];
    }

    private setOpts(opts: IDBClientCreate = null): this {
        this.opts = opts;
        return this;
    }

    public async count<T = any>(opModel: OpModelType<T>, where: { [k: string]: any } = {}): Promise<number> {
        return await this.getCollectionHandler(opModel._collection).count({ where });
    }

    public getPrismaClient(): PrismaClient {
        if (!this.client || !this.connected) {
            this.connectToDB();
        }

        return this.client as PrismaClient;
    }
}

export { DBService, IDBClientCreate };
