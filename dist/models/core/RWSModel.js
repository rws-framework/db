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
const utils_1 = require("../utils");
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
        return utils_1.RelationUtils.hasRelation(this.constructor, key);
    }
    async getRelationKey(key) {
        return utils_1.RelationUtils.getRelationKey(this.constructor, key);
    }
    bindRelation(key, relatedModel) {
        return utils_1.RelationUtils.bindRelation(relatedModel);
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
        if (allowRelations) {
            await utils_1.HydrateUtils.hydrateRelations(this, relManyData, relOneData, seriesHydrationfields, fullDataMode, data);
        }
        // Process regular fields and time series
        await utils_1.HydrateUtils.hydrateDataFields(this, collections_to_models, relOneData, seriesHydrationfields, fullDataMode, data);
        if (!this.isPostLoadExecuted() && postLoadExecute) {
            await this.postLoad();
        }
        return this;
    }
    getModelScalarFields(model) {
        return utils_1.ModelUtils.getModelScalarFields(model);
    }
    async getRelationOneMeta(classFields) {
        return utils_1.RelationUtils.getRelationOneMeta(this, classFields);
    }
    static async getRelationOneMeta(model, classFields) {
        return utils_1.RelationUtils.getRelationOneMeta(model, classFields);
    }
    async getRelationManyMeta(classFields) {
        return utils_1.RelationUtils.getRelationManyMeta(this, classFields);
    }
    static async getRelationManyMeta(model, classFields) {
        return utils_1.RelationUtils.getRelationManyMeta(model, classFields);
    }
    static async paginate(paginateParams, findParams) {
        return await utils_1.FindUtils.paginate(this, paginateParams, findParams);
    }
    async toMongo() {
        const data = {};
        const timeSeriesIds = utils_1.TimeSeriesUtils.getTimeSeriesModelFields(this);
        const timeSeriesHydrationFields = [];
        for (const key in this) {
            if (await this.hasRelation(key)) {
                if (this[key] === null) {
                    // For null relations, use disconnect or set to null
                    data[key] = {
                        disconnect: true
                    };
                }
                else {
                    data[key] = this.bindRelation(key, this[key]);
                }
                // Don't try to set the foreign key directly anymore
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
        const entryExists = await utils_1.ModelUtils.entryExists(this);
        if (entryExists) {
            await this.preUpdate();
            const pk = utils_1.ModelUtils.findPrimaryKeyFields(this.constructor);
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
        return utils_1.ModelUtils.getModelAnnotations(constructor);
    }
    async preUpdate() {
        return;
    }
    async postLoad() {
        this.setPostLoadExecuted();
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
        return utils_1.ModelUtils.isSubclass(constructor, baseClass);
    }
    hasTimeSeries() {
        return utils_1.TimeSeriesUtils.checkTimeSeries(this.constructor);
    }
    static checkTimeSeries(constructor) {
        return utils_1.TimeSeriesUtils.checkTimeSeries(constructor);
    }
    async isDbVariable(variable) {
        return utils_1.ModelUtils.checkDbVariable(this.constructor, variable);
    }
    static async checkDbVariable(constructor, variable) {
        return utils_1.ModelUtils.checkDbVariable(constructor, variable);
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
        return await utils_1.FindUtils.findOneBy(this, findParams);
    }
    static async find(id, findParams = null) {
        return await utils_1.FindUtils.find(this, id, findParams);
    }
    static async findBy(findParams) {
        return await utils_1.FindUtils.findBy(this, findParams);
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
        return utils_1.RelationUtils.checkRelDisabled(this, key);
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
    static getDb() {
        return this.services.dbService;
    }
    async reload(inPostLoad = false) {
        const pk = utils_1.ModelUtils.findPrimaryKeyFields(this.constructor);
        const where = {};
        if (Array.isArray(pk)) {
            for (const pkElem of pk) {
                where[pkElem] = this[pkElem];
            }
        }
        else {
            where[pk] = this[pk];
        }
        return await utils_1.FindUtils.findOneBy(this.constructor, { conditions: where, cancelPostLoad: inPostLoad });
    }
}
exports.RWSModel = RWSModel;
__decorate([
    (0, decorators_1.TrackType)(String),
    __metadata("design:type", Object)
], RWSModel.prototype, "id", void 0);
