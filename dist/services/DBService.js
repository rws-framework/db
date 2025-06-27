"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBService = void 0;
const client_1 = require("@prisma/client");
const mongodb_1 = require("mongodb");
const chalk_1 = __importDefault(require("chalk"));
class DBService {
    configService;
    client;
    opts = null;
    connected = false;
    constructor(configService) {
        this.configService = configService;
    }
    connectToDB(opts = null) {
        if (opts) {
            this.opts = opts;
        }
        else {
            this.opts = {
                dbUrl: this.configService.get('db_url'),
                dbName: this.configService.get('db_name'),
            };
        }
        if (!this.opts.dbUrl) {
            console.log(chalk_1.default.red('No database config set in @rws-framework/db'));
            return;
        }
        try {
            this.client = new client_1.PrismaClient({
                datasources: {
                    db: {
                        url: this.opts.dbUrl
                    },
                },
            });
            this.connected = true;
        }
        catch (e) {
            console.error(e);
            throw new Error('PRISMA CONNECTION ERROR');
        }
    }
    reconnect(opts = null) {
        this.connectToDB(opts);
    }
    static baseClientConstruct(dbUrl) {
        const client = new mongodb_1.MongoClient(dbUrl);
        return client;
    }
    async createBaseMongoClient() {
        const dbUrl = this.opts?.dbUrl || this.configService.get('db_url');
        const client = DBService.baseClientConstruct(dbUrl);
        await client.connect();
        return client;
    }
    async createBaseMongoClientDB() {
        const dbName = this.opts?.dbName || this.configService.get('db_name');
        const client = await this.createBaseMongoClient();
        return [client, client.db(dbName)];
    }
    async cloneDatabase(source, target) {
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
    async watchCollection(collectionName, preRun) {
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
    async insert(data, collection, isTimeSeries = false) {
        let result = data;
        // Insert time-series data outside of the transaction
        if (isTimeSeries) {
            const [client, db] = await this.createBaseMongoClientDB();
            const collectionHandler = db.collection(collection);
            const insert = await collectionHandler.insertOne(data);
            result = await this.findOneBy(collection, { id: insert.insertedId.toString() });
            return result;
        }
        const prismaCollection = this.getCollectionHandler(collection);
        result = await prismaCollection.create({ data });
        return await this.findOneBy(collection, { id: result.id });
    }
    async update(data, collection, pk) {
        const prismaCollection = this.getCollectionHandler(collection);
        const where = {};
        if (Array.isArray(pk)) {
            for (const pkElem of pk) {
                where[pkElem] = data[pkElem];
            }
        }
        else {
            where[pk] = data[pk];
        }
        if (!Array.isArray(pk)) {
            delete data[pk];
        }
        else {
            for (const cKey in pk) {
                delete data[cKey];
            }
        }
        await prismaCollection.update({
            where,
            data: data,
        });
        return await this.findOneBy(collection, where);
    }
    async findOneBy(collection, conditions, fields = null, ordering = null) {
        const params = { where: conditions };
        if (fields) {
            params.select = {};
            fields.forEach((fieldName) => {
                params.select[fieldName] = true;
            });
        }
        if (ordering) {
            params.orderBy = ordering;
        }
        const retData = await this.getCollectionHandler(collection).findFirst(params);
        return retData;
    }
    async delete(collection, conditions) {
        await this.getCollectionHandler(collection).deleteMany({ where: conditions });
        return;
    }
    async findBy(collection, conditions, fields = null, ordering = null, pagination = null) {
        const params = { where: conditions };
        if (fields) {
            params.select = {};
            fields.forEach((fieldName) => {
                params.select[fieldName] = true;
            });
        }
        if (ordering) {
            params.orderBy = ordering;
        }
        if (pagination) {
            const perPage = pagination.per_page || 50;
            params.skip = (pagination.page || 0) * perPage;
            params.take = perPage;
        }
        const retData = await this.getCollectionHandler(collection).findMany(params);
        return retData;
    }
    async collectionExists(collection_name) {
        const dbUrl = this.opts?.dbUrl || this.configService.get('db_url');
        const client = new mongodb_1.MongoClient(dbUrl);
        try {
            await client.connect();
            const db = client.db(this.configService.get('db_name'));
            const collections = await db.listCollections().toArray();
            const existingCollectionNames = collections.map((collection) => collection.name);
            return existingCollectionNames.includes(collection_name);
        }
        catch (error) {
            console.error('Error connecting to MongoDB:', error);
            throw error;
        }
    }
    async createTimeSeriesCollection(collection_name) {
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
        }
        catch (error) {
            console.error('Error connecting to MongoDB:', error);
            throw error;
        }
    }
    getCollectionHandler(collection) {
        if (!this.client || !this.connected) {
            this.connectToDB();
        }
        return this.client[collection];
    }
    setOpts(opts = null) {
        this.opts = opts;
        return this;
    }
    async count(opModel, where = {}) {
        return await this.getCollectionHandler(opModel._collection).count({ where });
    }
}
exports.DBService = DBService;
