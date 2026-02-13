import { PrismaClient } from '@prisma/client';
import { Collection, Db, MongoClient } from 'mongodb';
import {ITimeSeries} from '../types/ITimeSeries';
import { IModel } from '../models/interfaces/IModel';
import chalk from 'chalk';
import { IDbConfigHandler } from '../types/DbConfigHandler';
import { IPaginationParams, OrderByType, OrderByField, OrderByArray } from '../types/FindParams';
import { OpModelType } from '../models/interfaces/OpModelType';

interface IDBClientCreate {
  dbUrl?: string;
  dbName?: string;
}

class DBService {
    private client: PrismaClient;
    private opts: IDBClientCreate = null;
    private connected = false;

    constructor(private configService: IDbConfigHandler){}

    private connectToDB(opts: IDBClientCreate = null) {
        if(opts){
            this.opts = opts;
        }else{
            this.opts = {
                dbUrl: this.configService.get('db_url'),        
                dbName: this.configService.get('db_name'),
            };
        }

        if(!this.opts.dbUrl){
            console.log(chalk.red('No database config set in @rws-framework/db'));

            return;
        }    
  
        try{
            this.client = new PrismaClient({ 
                datasources: {
                    db: {
                        url: this.opts.dbUrl
                    },
                },
            });     

            this.connected = true;
        } catch (e: Error | any){                        
            console.error(e);
        
            throw new Error('PRISMA CONNECTION ERROR');
        }
    }

    reconnect(opts: IDBClientCreate = null)
    {
        this.connectToDB(opts);
    }

    static baseClientConstruct(dbUrl: string): MongoClient
    {        
        const client = new MongoClient(dbUrl);

        return client;
    }

    public async createBaseMongoClient(): Promise<MongoClient>
    {
        const dbUrl = this.opts?.dbUrl || this.configService.get('db_url');
        const client = DBService.baseClientConstruct(dbUrl);
    
        await client.connect();

        return client;

    }

    public async createBaseMongoClientDB(): Promise<[MongoClient, Db]>
    {
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

    async watchCollection(collectionName: string, preRun: () => void): Promise<any>
    {    
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

        if(isTimeSeries){
            const [client, db] = await this.createBaseMongoClientDB();
            const collectionHandler = db.collection(collection);
      
            const insert = await collectionHandler.insertOne(data);

            result = await this.findOneBy(collection, { id: insert.insertedId.toString()  });
            return result;
        }

        const prismaCollection = this.getCollectionHandler(collection);    

        result = await prismaCollection.create({ data });

        return await this.findOneBy(collection, { id: result.id });
    }

    async update(data: any, collection: string, pk: string | string[]): Promise<IModel> 
    {        

        const prismaCollection = this.getCollectionHandler(collection);


        const where: any = {};
                    
        if(Array.isArray(pk)){            
            for(const pkElem of pk){
                where[pkElem] = data[pkElem];
            }
        }else{
            where[pk as string] = data[pk as string]
        }         

        if(!Array.isArray(pk)){
            delete data[pk];
        }else{
            for(const cKey in pk){
                delete data[cKey];
            }
        }        

        // Convert foreign key fields to Prisma relation syntax
        const processedData = this.convertForeignKeysToRelations(data);

        await prismaCollection.update({
            where,
            data: processedData,
        });    

        
        return await this.findOneBy(collection, where);
    }
  

    async findOneBy(collection: string, conditions: any, fields: string[] | null = null, ordering: OrderByType = null, prismaOptions: any = null): Promise<IModel|null>
    {    
        const params: any = { where: conditions };

        if(fields){
            params.select = {};
            fields.forEach((fieldName: string) => {        
                params.select[fieldName] = true;
            });    
            
            // Add relation fields to select instead of using include when fields are specified
            if(prismaOptions?.include) {
                Object.keys(prismaOptions.include).forEach(relationField => {
                    if (fields.includes(relationField)) {
                        params.select[relationField] = true;
                    }
                });
            }
        } else if(prismaOptions?.include) {
            // Only use include when no fields are specified
            params.include = prismaOptions.include;
        }

        if(ordering){
            params.orderBy = this.convertOrderingToPrismaFormat(ordering);
        }

        const retData = await this.getCollectionHandler(collection).findFirst(params);

        return retData;
    }

    async delete(collection: string, conditions: any): Promise<void>
    {    
        await this.getCollectionHandler(collection).deleteMany({ where: conditions });
        return;
    }

    async findBy(
        collection: string, 
        conditions: any, 
        fields: string[] | null = null, 
        ordering: OrderByType = null, 
        pagination: IPaginationParams = null,
        prismaOptions: any = null): Promise<IModel[]>
    {    
        const params: any ={ where: conditions };

        if(fields){
            params.select = {};
            fields.forEach((fieldName: string) => {        
                params.select[fieldName] = true;
            });    
            
            // Add relation fields to select instead of using include when fields are specified
            if(prismaOptions?.include) {
                Object.keys(prismaOptions.include).forEach(relationField => {
                    if (fields.includes(relationField)) {
                        params.select[relationField] = true;
                    }
                });
            }
        } else if(prismaOptions?.include) {
            // Only use include when no fields are specified
            params.include = prismaOptions.include;
        }

        if(ordering){
            params.orderBy = this.convertOrderingToPrismaFormat(ordering);
        }    

        if(pagination){
            const perPage = pagination.per_page || 50;
            params.skip = (pagination.page || 0) * perPage;
            params.take = perPage;
        }

        const retData = await this.getCollectionHandler(collection).findMany(params);        

        return retData;
    }

    async collectionExists(collection_name: string): Promise<boolean>
    {
        const dbUrl = this.opts?.dbUrl || this.configService.get('db_url');
        const client = new MongoClient(dbUrl);

        try {
            await client.connect();    

            const db = client.db(this.configService.get('db_name'));

            const collections = await db.listCollections().toArray();
            const existingCollectionNames = collections.map((collection) => collection.name);

            return existingCollectionNames.includes(collection_name);
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);

            throw error;
        }    
    }

    async createTimeSeriesCollection(collection_name: string): Promise<Collection<ITimeSeries>>
    {    
        try {    
            const [client, db] = await this.createBaseMongoClientDB();

            // Create a time series collection
            const options = {
                timeseries: {
                    timeField: 'timestamp', // Replace with your timestamp field
                    metaField: 'params' // Replace with your metadata field
                }
            };

            await db.createCollection(collection_name, options); // Replace with your collection name

            return db.collection(collection_name);

        } catch (error) {
            console.error('Error connecting to MongoDB:', error);

            throw error;
        }
    }

    private getCollectionHandler(collection: string): any 
    {    
        if(!this.client || !this.connected){
            this.connectToDB();
        }

        return (this.client[collection as keyof PrismaClient] as any);
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

    private setOpts(opts: IDBClientCreate = null): this
    {    
        this.opts = opts;
        return this;
    }

    public async count<T = any>(opModel: OpModelType<T>, where: {[k: string]: any} = {}): Promise<number>{        
        return await this.getCollectionHandler(opModel._collection).count({where});
    }

    /**
     * Convert foreign key fields to Prisma relation syntax
     * Handles common patterns like user_id -> creator, avatar_id -> avatar, etc.
     */
    private convertForeignKeysToRelations(data: any): any {
        const processedData = { ...data };
        const relationMappings: { [key: string]: string } = {
            // Common relation mappings for foreign keys to relation names
            'user_id': 'creator',
            'avatar_id': 'avatar',
            'file_id': 'logo',
            'company_id': 'company',
            'user_group_id': 'userGroup',
            'accountGrade_id': 'accountGrade',
            'account_balance_id': 'accountBalance',
            'knowledgeGroup_id': 'project',
            'conversation_id': 'conversation',
            'message_id': 'message',
            'knowledge_id': 'knowledge',
            'profession_id': 'profession',
            'step_id': 'step',
            'question_id': 'question',
            'tutorial_id': 'tutorial',
            'tutorial_step_id': 'tutorialStep',
            'tutorial_section_id': 'tutorialSection',
            'todo_id': 'todo',
            'bot_test_id': 'botTest',
            'bot_test_tester_id': 'tester',
            'bot_test_target_id': 'target',
            'branch_id': 'branch',
            'acl_policy_id': 'policy',
            'instruction_file_id': 'instructionFile'
        };

        // Convert foreign key fields to relation syntax
        Object.keys(processedData).forEach(key => {
            if (key.endsWith('_id') && relationMappings[key]) {
                const relationField = relationMappings[key];
                const value = processedData[key];
                
                // Remove the foreign key field
                delete processedData[key];
                
                // Add the relation field with proper Prisma syntax
                if (value === null || value === undefined) {
                    processedData[relationField] = { disconnect: true };
                } else {
                    processedData[relationField] = { connect: { id: value } };
                }
            }
        });

        return processedData;
    }

    public getPrismaClient(): PrismaClient
    {
        if(!this.client || !this.connected){
            this.connectToDB();
        }

        return this.client;
    }
}

export { DBService, IDBClientCreate };
