"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RWSModel = void 0;
const decorators_1 = require("../../decorators");
const FieldsHelper_1 = require("../../helper/FieldsHelper");
const RelationUtils_1 = require("../utils/RelationUtils");
const TimeSeriesUtils_1 = require("../utils/TimeSeriesUtils");
const ModelUtils_1 = require("../utils/ModelUtils");
const HydrateUtils_1 = require("../utils/HydrateUtils");
const FindUtils_1 = require("../utils/FindUtils");
class RWSModel {
    static services = {};
    id;
    static _collection = null;
    static _RELATIONS = {};
    static _NO_ID = false;
    static _SUPER_TAGS = [];
    static _BANNED_KEYS = ['_collection'];
    static allModels = [];
    static _CUT_KEYS = [];
    postLoadExecuted = false;
    constructor(data = null) {
        if (!this.getCollection()) {
            throw new Error('Model must have a collection defined');
        }
        this.dbService = RWSModel.services.dbService;
        this.configService = RWSModel.services.configService;
        if (!data) {
            return;
        }
        if (!this.hasTimeSeries()) {
            this._fill(data);
        }
        else {
            throw new Error('Time Series not supported in synchronous constructor. Use `await Model.create(data)` static method to instantiate this model.');
        }
    }
    isPostLoadExecuted() {
        return this.postLoadExecuted;
    }
    setPostLoadExecuted() {
        this.postLoadExecuted = true;
    }
    checkForInclusionWithThrow() {
        const constructor = this.constructor;
        if (!constructor.checkForInclusion(constructor.name)) {
            throw new Error('Model undefined: ' + constructor.name);
        }
    }
    static checkForInclusionWithThrow(checkModelType) {
        if (!this.checkForInclusion(this.name)) {
            throw new Error('Model undefined: ' + this.name);
        }
    }
    checkForInclusion() {
        const constructor = this.constructor;
        return constructor.checkForInclusion(constructor.name);
    }
    static checkForInclusion(checkModelType) {
        return this.loadModels().find((definedModel) => {
            return definedModel.name === checkModelType;
        }) !== undefined;
    }
    _fill(data) {
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const meta = Reflect.getMetadata(`InverseTimeSeries:${key}`, this.constructor.prototype);
                if (meta) {
                    data[key] = {
                        create: data[key]
                    };
                }
                else {
                    this[key] = data[key];
                }
            }
        }
        return this;
    }
    async hasRelation(key) {
        return RelationUtils_1.RelationUtils.hasRelation(this.constructor, key);
    }
    async getRelationKey(key) {
        return RelationUtils_1.RelationUtils.getRelationKey(this.constructor, key);
    }
    bindRelation(key, relatedModel) {
        return RelationUtils_1.RelationUtils.bindRelation(relatedModel);
    }
    async _asyncFill(data, fullDataMode = false, allowRelations = true, postLoadExecute = true) {
        const collections_to_models = {};
        const classFields = FieldsHelper_1.FieldsHelper.getAllClassFields(this.constructor);
        // Get both relation metadata types asynchronously
        const [relOneData, relManyData] = await Promise.all([
            this.getRelationOneMeta(classFields),
            this.getRelationManyMeta(classFields)
        ]);
        this.loadModels().forEach((model) => {
            collections_to_models[model.getCollection()] = model;
        });
        const seriesHydrationfields = [];
        // Check if relations are already populated from Prisma includes
        const relationsAlreadyPopulated = this.checkRelationsPrePopulated(data, relOneData, relManyData);
        if (allowRelations && !relationsAlreadyPopulated) {
            // Use traditional relation hydration if not pre-populated
            await HydrateUtils_1.HydrateUtils.hydrateRelations(this, relManyData, relOneData, seriesHydrationfields, fullDataMode, data);
        }
        else if (allowRelations && relationsAlreadyPopulated) {
            // Relations are already populated from Prisma, just assign them directly
            await this.hydratePrePopulatedRelations(data, relOneData, relManyData);
            // Create a copy of data without relation fields to prevent overwriting hydrated relations
            const dataWithoutRelations = { ...data };
            for (const key in relOneData) {
                delete dataWithoutRelations[key];
            }
            for (const key in relManyData) {
                delete dataWithoutRelations[key];
            }
            data = dataWithoutRelations;
        }
        // Process regular fields and time series (excluding relations when pre-populated)
        await HydrateUtils_1.HydrateUtils.hydrateDataFields(this, collections_to_models, relOneData, seriesHydrationfields, fullDataMode, data);
        if (!this.isPostLoadExecuted() && postLoadExecute) {
            await this.postLoad();
            this.setPostLoadExecuted();
        }
        return this;
    }
    getModelScalarFields(model) {
        return ModelUtils_1.ModelUtils.getModelScalarFields(model);
    }
    async getRelationOneMeta(classFields) {
        return RelationUtils_1.RelationUtils.getRelationOneMeta(this, classFields);
    }
    static async getRelationOneMeta(model, classFields) {
        return RelationUtils_1.RelationUtils.getRelationOneMeta(model, classFields);
    }
    async getRelationManyMeta(classFields) {
        return RelationUtils_1.RelationUtils.getRelationManyMeta(this, classFields);
    }
    static async getRelationManyMeta(model, classFields) {
        return RelationUtils_1.RelationUtils.getRelationManyMeta(model, classFields);
    }
    static async paginate(paginateParams, findParams) {
        return await FindUtils_1.FindUtils.paginate(this, paginateParams, findParams);
    }
    async toMongo() {
        const data = {};
        const timeSeriesIds = TimeSeriesUtils_1.TimeSeriesUtils.getTimeSeriesModelFields(this);
        const timeSeriesHydrationFields = [];
        // Get relation metadata to determine how to handle each relation
        const classFields = FieldsHelper_1.FieldsHelper.getAllClassFields(this.constructor);
        const relOneData = await this.getRelationOneMeta(classFields);
        for (const key in this) {
            if (await this.hasRelation(key)) {
                const relationMeta = relOneData[key];
                if (relationMeta) {
                    // Use connect on relations that are either:
                    // 1. Required (required: true)
                    // 2. Have explicitly set cascade options (metaOpts.cascade)
                    const hasExplicitCascade = relationMeta.cascade && Object.keys(relationMeta.cascade).length > 0;
                    const shouldUseConnect = relationMeta.required || hasExplicitCascade;
                    if (shouldUseConnect) {
                        // Relations with required=true or explicit cascade → use connect
                        if (this[key] === null) {
                            data[key] = { disconnect: true };
                        }
                        else if (this[key] && this[key].id) {
                            data[key] = { connect: { id: this[key].id } };
                        }
                    }
                    else {
                        // Simple optional relations → use foreign key field directly
                        const foreignKeyField = relationMeta.hydrationField;
                        if (this[key] === null) {
                            data[foreignKeyField] = null;
                        }
                        else if (this[key] && this[key].id) {
                            data[foreignKeyField] = this[key].id;
                        }
                    }
                }
                continue;
            }
            if (!(await this.isDbVariable(key))) {
                continue;
            }
            const passedFieldCondition = this.hasOwnProperty(key) &&
                !(this.constructor._BANNED_KEYS
                    || RWSModel._BANNED_KEYS).includes(key) &&
                !timeSeriesHydrationFields.includes(key);
            if (passedFieldCondition) {
                data[key] = this[key];
            }
            if (timeSeriesIds[key]) {
                data[key] = this[key];
                timeSeriesHydrationFields.push(timeSeriesIds[key].hydrationField);
            }
        }
        return data;
    }
    getCollection() {
        return this.constructor._collection || this._collection;
    }
    static getCollection() {
        return this.constructor._collection || this._collection;
    }
    async save() {
        const data = await this.toMongo();
        let updatedModelData = data;
        const entryExists = await ModelUtils_1.ModelUtils.entryExists(this);
        if (entryExists) {
            await this.preUpdate();
            const pk = ModelUtils_1.ModelUtils.findPrimaryKeyFields(this.constructor);
            updatedModelData = await this.dbService.update(data, this.getCollection(), pk);
            await this._asyncFill(updatedModelData);
            await this.postUpdate();
        }
        else {
            await this.preCreate();
            const isTimeSeries = false; //this instanceof timeSeriesModel;
            updatedModelData = await this.dbService.insert(data, this.getCollection(), isTimeSeries);
            await this._asyncFill(updatedModelData);
            await this.postCreate();
        }
        return this;
    }
    static async getModelAnnotations(constructor) {
        return ModelUtils_1.ModelUtils.getModelAnnotations(constructor);
    }
    async preUpdate() {
        return;
    }
    async postLoad() {
        return;
    }
    async postUpdate() {
        return;
    }
    async preCreate() {
        return;
    }
    async postCreate() {
        return;
    }
    static isSubclass(constructor, baseClass) {
        return ModelUtils_1.ModelUtils.isSubclass(constructor, baseClass);
    }
    hasTimeSeries() {
        return TimeSeriesUtils_1.TimeSeriesUtils.checkTimeSeries(this.constructor);
    }
    static checkTimeSeries(constructor) {
        return TimeSeriesUtils_1.TimeSeriesUtils.checkTimeSeries(constructor);
    }
    async isDbVariable(variable) {
        return ModelUtils_1.ModelUtils.checkDbVariable(this.constructor, variable);
    }
    static async checkDbVariable(constructor, variable) {
        return ModelUtils_1.ModelUtils.checkDbVariable(constructor, variable);
    }
    sanitizeDBData(data) {
        const dataKeys = Object.keys(data);
        const sanitizedData = {};
        for (const key of dataKeys) {
            if (this.isDbVariable(key)) {
                sanitizedData[key] = data[key];
            }
        }
        return sanitizedData;
    }
    static async watchCollection(preRun) {
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        return await this.services.dbService.watchCollection(collection, preRun);
    }
    static async findOneBy(findParams) {
        return await FindUtils_1.FindUtils.findOneBy(this, findParams);
    }
    static async find(id, findParams = null) {
        return await FindUtils_1.FindUtils.find(this, id, findParams);
    }
    static async findBy(findParams) {
        return await FindUtils_1.FindUtils.findBy(this, findParams);
    }
    static async delete(conditions) {
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        return await this.services.dbService.delete(collection, conditions);
    }
    async delete() {
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow();
        return await this.dbService.delete(collection, {
            id: this.id
        });
    }
    static async create(data) {
        const newModel = new this();
        const sanitizedData = newModel.sanitizeDBData(data);
        await newModel._asyncFill(sanitizedData);
        return newModel;
    }
    static loadModels() {
        return this.allModels || [];
    }
    loadModels() {
        return RWSModel.loadModels();
    }
    checkRelDisabled(key) {
        return RelationUtils_1.RelationUtils.checkRelDisabled(this, key);
    }
    static setServices(services) {
        this.allModels = services.configService.get('db_models');
        this.services = services;
    }
    getDb() {
        return this.services.dbService;
    }
    static async count(where = {}) {
        return await this.services.dbService.count(this, where);
    }
    /**
     * Build Prisma include object for relation preloading
     */
    static async buildPrismaIncludes(fields) {
        const tempInstance = new this();
        const classFields = FieldsHelper_1.FieldsHelper.getAllClassFields(this);
        const [relOneData, relManyData] = await Promise.all([
            this.getRelationOneMeta(tempInstance, classFields),
            this.getRelationManyMeta(tempInstance, classFields)
        ]);
        // Get relations configuration from @RWSCollection decorator
        const allowedRelations = this._RELATIONS || {};
        const hasRelationsConfig = Object.keys(allowedRelations).length > 0;
        const includes = {};
        // Helper function to determine if a relation should be included
        const shouldIncludeRelation = (relationName) => {
            // If relations config exists, only include relations that are explicitly enabled
            if (hasRelationsConfig) {
                if (!allowedRelations[relationName]) {
                    return false;
                }
            }
            // If fields are specified, only include if relation is in fields array
            if (fields && fields.length > 0) {
                return fields.includes(relationName);
            }
            // If no fields specified but relations config exists, include enabled relations
            if (hasRelationsConfig) {
                return allowedRelations[relationName] === true;
            }
            // If no relations config and no fields specified, include all relations
            return true;
        };
        // Add one-to-one and many-to-one relations
        for (const key in relOneData) {
            if (shouldIncludeRelation(key)) {
                includes[key] = true;
            }
        }
        // Add one-to-many relations
        for (const key in relManyData) {
            if (shouldIncludeRelation(key)) {
                includes[key] = true;
            }
        }
        return Object.keys(includes).length > 0 ? includes : null;
    }
    /**
     * Check if relations are already populated from Prisma includes
     */
    checkRelationsPrePopulated(data, relOneData, relManyData) {
        // Check if any relation key in data contains object data instead of just ID
        for (const key in relOneData) {
            if (data[key] && typeof data[key] === 'object' && data[key] !== null) {
                // For one-to-one relations, check if it has an id or if it's a full object
                if (data[key].id || Object.keys(data[key]).length > 1) {
                    return true;
                }
            }
        }
        for (const key in relManyData) {
            const relationValue = data[key];
            const relMeta = relManyData[key];
            if (relMeta.singular) {
                // Singular inverse relation - should be a single object
                if (relationValue && typeof relationValue === 'object' && relationValue !== null &&
                    (relationValue.id || Object.keys(relationValue).length > 1)) {
                    return true;
                }
            }
            else if (relationValue && Array.isArray(relationValue) && relationValue.length > 0) {
                // Regular one-to-many relations - should be arrays
                if (typeof relationValue[0] === 'object' && relationValue[0] !== null) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Hydrate pre-populated relations from Prisma includes (one level only)
     */
    async hydratePrePopulatedRelations(data, relOneData, relManyData) {
        // Handle one-to-one and many-to-one relations
        for (const key in relOneData) {
            if (data[key] && typeof data[key] === 'object' && data[key] !== null) {
                const relationData = data[key];
                const relMeta = relOneData[key];
                const ModelClass = relMeta.model; // Use the model class directly from metadata
                if (ModelClass) {
                    // Check if it's already a full object with data or just an ID reference
                    if (relationData.id || Object.keys(relationData).length > 1) {
                        // Create new instance and hydrate ONLY basic fields, NO RELATIONS
                        const relatedInstance = new ModelClass();
                        await relatedInstance._asyncFill(relationData, false, false, true);
                        this[key] = relatedInstance;
                    }
                }
            }
        }
        // Handle one-to-many relations
        for (const key in relManyData) {
            if (data[key]) {
                const relationData = data[key];
                const relMeta = relManyData[key];
                const ModelClass = relMeta.inversionModel; // Use the model class directly from metadata
                if (ModelClass) {
                    // Check if this is a singular inverse relation
                    if (relMeta.singular && !Array.isArray(relationData)) {
                        // Handle singular inverse relation as a single object
                        if (typeof relationData === 'object' && relationData !== null &&
                            (relationData.id || Object.keys(relationData).length > 1)) {
                            const relatedInstance = new ModelClass();
                            await relatedInstance._asyncFill(relationData, false, false, true);
                            this[key] = relatedInstance;
                        }
                    }
                    else if (Array.isArray(relationData) && relationData.length > 0) {
                        // Handle regular one-to-many relations as arrays
                        const relatedInstances = [];
                        for (const itemData of relationData) {
                            if (typeof itemData === 'object' && itemData !== null) {
                                const relatedInstance = new ModelClass();
                                await relatedInstance._asyncFill(itemData, false, false, true);
                                relatedInstances.push(relatedInstance);
                            }
                        }
                        this[key] = relatedInstances;
                    }
                }
            }
        }
    }
    static getDb() {
        return this.services.dbService;
    }
    async reload() {
        const pk = ModelUtils_1.ModelUtils.findPrimaryKeyFields(this.constructor);
        const where = {};
        if (Array.isArray(pk)) {
            for (const pkElem of pk) {
                where[pkElem] = this[pkElem];
            }
        }
        else {
            where[pk] = this[pk];
        }
        // Find the fresh data from database
        const freshData = await FindUtils_1.FindUtils.findOneBy(this.constructor, { conditions: where });
        if (!freshData) {
            return null;
        }
        // Convert the fresh instance back to plain data for hydration
        const plainData = await freshData.toMongo();
        // Hydrate current instance with fresh data including relations
        await this._asyncFill(plainData, true, true, true);
        return this;
    }
}
exports.RWSModel = RWSModel;
__decorate([
    (0, decorators_1.TrackType)(String),
    __metadata("design:type", Object)
], RWSModel.prototype, "id", void 0);
