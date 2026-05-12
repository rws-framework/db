"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBService = void 0;
const client_1 = require("@prisma/client");
const chalk_1 = __importDefault(require("chalk"));
class DBService {
    configService;
    client;
    opts = null;
    connected = false;
    extensions = [];
    constructor(configService) {
        this.configService = configService;
    }
    addExtension(extension) {
        const extName = extension.name;
        if (extName && this.extensions.some(ext => ext.name === extName)) {
            console.warn(chalk_1.default.yellow(`Extension with name ${extName} already exists. Skipping.`));
            return;
        }
        this.extensions.push(client_1.Prisma.defineExtension(extension));
        if (this.connected) {
            this.reconnect();
        }
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
            let theClient = new client_1.PrismaClient({
                datasourceUrl: this.opts.dbUrl,
            });
            for (const ext of this.extensions) {
                theClient = theClient.$extends(ext);
            }
            console.log('DB EXTENSIONS: ', this.extensions.length);
            this.client = theClient;
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
    async insert(data, collection, isTimeSeries = false) {
        let result = data;
        // Insert time-series data outside of the transaction
        if (isTimeSeries) {
            const prisma = this.getPrismaClient();
            const insertResult = await prisma.$runCommandRaw({
                insert: collection,
                documents: [data]
            });
            const insertedId = insertResult.insertedIds?.[0]?.toString() ?? data.id;
            result = await this.findOneBy(collection, { id: insertedId });
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
            data,
        });
        return await this.findOneBy(collection, where);
    }
    async findOneBy(collection, conditions, fields = null, ordering = null, prismaOptions = null) {
        const params = { where: conditions };
        if (fields) {
            params.select = {};
            fields.forEach((fieldName) => {
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
        }
        else if (prismaOptions?.include) {
            // Only use include when no fields are specified
            params.include = prismaOptions.include;
        }
        if (ordering) {
            params.orderBy = this.convertOrderingToPrismaFormat(ordering);
        }
        const retData = await this.getCollectionHandler(collection).findFirst(params);
        return retData;
    }
    async delete(collection, conditions) {
        await this.getCollectionHandler(collection).deleteMany({ where: conditions });
        return;
    }
    async findBy(collection, conditions, fields = null, ordering = null, pagination = null, prismaOptions = null) {
        const params = { where: conditions };
        if (fields) {
            params.select = {};
            fields.forEach((fieldName) => {
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
        }
        else if (prismaOptions?.include) {
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
    async collectionExists(collection_name) {
        try {
            const prisma = this.getPrismaClient();
            const result = await prisma.$runCommandRaw({
                listCollections: 1,
                filter: { name: collection_name },
                nameOnly: true
            });
            const batch = result.cursor?.firstBatch;
            return (batch?.length ?? 0) > 0;
        }
        catch (error) {
            console.error('Error checking MongoDB collection:', error);
            throw error;
        }
    }
    async createTimeSeriesCollection(collection_name) {
        try {
            const prisma = this.getPrismaClient();
            await prisma.$runCommandRaw({
                create: collection_name,
                timeseries: {
                    timeField: 'timestamp',
                    metaField: 'params'
                }
            });
        }
        catch (error) {
            console.error('Error creating MongoDB time series collection:', error);
            throw error;
        }
    }
    getCollectionHandler(collection) {
        if (!this.client || !this.connected) {
            this.connectToDB();
        }
        return Reflect.get(this.client, collection);
    }
    convertOrderingToPrismaFormat(ordering) {
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
    setOpts(opts = null) {
        this.opts = opts;
        return this;
    }
    async count(opModel, where = {}) {
        return await this.getCollectionHandler(opModel._collection).count({ where });
    }
    getPrismaClient() {
        if (!this.client || !this.connected) {
            this.connectToDB();
        }
        return this.client;
    }
}
exports.DBService = DBService;
