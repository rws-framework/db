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
class RWSModel {
    constructor(data) {
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
    hasRelation(key) {
        return RelationUtils_1.RelationUtils.hasRelation(this, key);
    }
    bindRelation(key, relatedModel) {
        return RelationUtils_1.RelationUtils.bindRelation(relatedModel);
    }
    async _asyncFill(data, fullDataMode = false, allowRelations = true) {
        const collections_to_models = {};
        const timeSeriesIds = TimeSeriesUtils_1.TimeSeriesUtils.getTimeSeriesModelFields(this);
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
            // Handle many-to-many relations
            for (const key in relManyData) {
                if (!fullDataMode && this.constructor._CUT_KEYS.includes(key)) {
                    continue;
                }
                const relMeta = relManyData[key];
                const relationEnabled = RelationUtils_1.RelationUtils.checkRelEnabled(this, relMeta.key);
                if (relationEnabled) {
                    this[relMeta.key] = await relMeta.inversionModel.findBy({
                        conditions: {
                            [relMeta.foreignKey]: data.id
                        },
                        allowRelations: false
                    });
                }
            }
            // Handle one-to-one relations
            for (const key in relOneData) {
                if (!fullDataMode && this.constructor._CUT_KEYS.includes(key)) {
                    continue;
                }
                const relMeta = relOneData[key];
                const relationEnabled = RelationUtils_1.RelationUtils.checkRelEnabled(this, relMeta.key);
                if (!data[relMeta.hydrationField] && relMeta.required) {
                    throw new Error(`Relation field "${relMeta.hydrationField}" is required in model ${this.constructor.name}.`);
                }
                if (relationEnabled && data[relMeta.hydrationField]) {
                    this[relMeta.key] = await relMeta.model.find(data[relMeta.hydrationField], { allowRelations: false });
                }
                else if (relationEnabled && !data[relMeta.hydrationField] && data[relMeta.key]) {
                    const newRelModel = await relMeta.model.create(data[relMeta.key]);
                    this[relMeta.key] = await newRelModel.save();
                }
                const cutKeys = this.constructor._CUT_KEYS;
                if (!cutKeys.includes(relMeta.hydrationField)) {
                    cutKeys.push(relMeta.hydrationField);
                }
            }
        }
        // Process regular fields and time series
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (!fullDataMode && this.constructor._CUT_KEYS.includes(key)) {
                    continue;
                }
                if (Object.keys(relOneData).includes(key)) {
                    continue;
                }
                if (seriesHydrationfields.includes(key)) {
                    continue;
                }
                const timeSeriesMetaData = timeSeriesIds[key];
                if (timeSeriesMetaData) {
                    this[key] = data[key];
                    const seriesModel = collections_to_models[timeSeriesMetaData.collection];
                    const dataModels = await seriesModel.findBy({
                        id: { in: data[key] }
                    });
                    seriesHydrationfields.push(timeSeriesMetaData.hydrationField);
                    this[timeSeriesMetaData.hydrationField] = dataModels;
                }
                else {
                    this[key] = data[key];
                }
            }
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
        var _a, _b, _c, _d, _e;
        const conditions = (_a = findParams === null || findParams === void 0 ? void 0 : findParams.conditions) !== null && _a !== void 0 ? _a : {};
        const ordering = (_b = findParams === null || findParams === void 0 ? void 0 : findParams.ordering) !== null && _b !== void 0 ? _b : null;
        const fields = (_c = findParams === null || findParams === void 0 ? void 0 : findParams.fields) !== null && _c !== void 0 ? _c : null;
        const allowRelations = (_d = findParams === null || findParams === void 0 ? void 0 : findParams.allowRelations) !== null && _d !== void 0 ? _d : true;
        const fullData = (_e = findParams === null || findParams === void 0 ? void 0 : findParams.fullData) !== null && _e !== void 0 ? _e : false;
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        try {
            const dbData = await this.services.dbService.findBy(collection, conditions, fields, ordering, paginateParams);
            if (dbData.length) {
                const instanced = [];
                for (const data of dbData) {
                    const inst = new this();
                    instanced.push((await inst._asyncFill(data, fullData, allowRelations)));
                }
                return instanced;
            }
            return [];
        }
        catch (rwsError) {
            console.error(rwsError);
            throw rwsError;
        }
    }
    async toMongo() {
        const data = {};
        const timeSeriesIds = TimeSeriesUtils_1.TimeSeriesUtils.getTimeSeriesModelFields(this);
        const timeSeriesHydrationFields = [];
        for (const key in this) {
            if (this.hasRelation(key)) {
                data[key] = this.bindRelation(key, this[key]);
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
        if (this.id) {
            this.preUpdate();
            updatedModelData = await this.dbService.update(data, this.getCollection());
            await this._asyncFill(updatedModelData);
            this.postUpdate();
        }
        else {
            this.preCreate();
            const isTimeSeries = false; //this instanceof timeSeriesModel;
            updatedModelData = await this.dbService.insert(data, this.getCollection(), isTimeSeries);
            await this._asyncFill(updatedModelData);
            this.postCreate();
        }
        return this;
    }
    static async getModelAnnotations(constructor) {
        return ModelUtils_1.ModelUtils.getModelAnnotations(constructor);
    }
    preUpdate() {
        return;
    }
    postUpdate() {
        return;
    }
    preCreate() {
        return;
    }
    postCreate() {
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
        var _a, _b, _c, _d, _e;
        const conditions = (_a = findParams === null || findParams === void 0 ? void 0 : findParams.conditions) !== null && _a !== void 0 ? _a : {};
        const ordering = (_b = findParams === null || findParams === void 0 ? void 0 : findParams.ordering) !== null && _b !== void 0 ? _b : null;
        const fields = (_c = findParams === null || findParams === void 0 ? void 0 : findParams.fields) !== null && _c !== void 0 ? _c : null;
        const allowRelations = (_d = findParams === null || findParams === void 0 ? void 0 : findParams.allowRelations) !== null && _d !== void 0 ? _d : true;
        const fullData = (_e = findParams === null || findParams === void 0 ? void 0 : findParams.fullData) !== null && _e !== void 0 ? _e : false;
        this.checkForInclusionWithThrow('');
        const collection = Reflect.get(this, '_collection');
        const dbData = await this.services.dbService.findOneBy(collection, conditions, fields, ordering, allowRelations);
        if (dbData) {
            const inst = new this();
            return await inst._asyncFill(dbData, fullData, allowRelations);
        }
        return null;
    }
    static async find(id, findParams = null) {
        var _a, _b, _c, _d;
        const ordering = (_a = findParams === null || findParams === void 0 ? void 0 : findParams.ordering) !== null && _a !== void 0 ? _a : null;
        const fields = (_b = findParams === null || findParams === void 0 ? void 0 : findParams.fields) !== null && _b !== void 0 ? _b : null;
        const allowRelations = (_c = findParams === null || findParams === void 0 ? void 0 : findParams.allowRelations) !== null && _c !== void 0 ? _c : true;
        const fullData = (_d = findParams === null || findParams === void 0 ? void 0 : findParams.fullData) !== null && _d !== void 0 ? _d : false;
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        const dbData = await this.services.dbService.findOneBy(collection, { id }, fields, ordering, allowRelations);
        if (dbData) {
            const inst = new this();
            return await inst._asyncFill(dbData, fullData, allowRelations);
        }
        return null;
    }
    static async findBy(findParams) {
        var _a, _b, _c, _d, _e;
        const conditions = (_a = findParams === null || findParams === void 0 ? void 0 : findParams.conditions) !== null && _a !== void 0 ? _a : {};
        const ordering = (_b = findParams === null || findParams === void 0 ? void 0 : findParams.ordering) !== null && _b !== void 0 ? _b : null;
        const fields = (_c = findParams === null || findParams === void 0 ? void 0 : findParams.fields) !== null && _c !== void 0 ? _c : null;
        const allowRelations = (_d = findParams === null || findParams === void 0 ? void 0 : findParams.allowRelations) !== null && _d !== void 0 ? _d : true;
        const fullData = (_e = findParams === null || findParams === void 0 ? void 0 : findParams.fullData) !== null && _e !== void 0 ? _e : false;
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        try {
            const dbData = await this.services.dbService.findBy(collection, conditions, fields, ordering);
            if (dbData.length) {
                const instanced = [];
                for (const data of dbData) {
                    const inst = new this();
                    instanced.push((await inst._asyncFill(data, fullData, allowRelations)));
                }
                return instanced;
            }
            return [];
        }
        catch (rwsError) {
            console.error(rwsError);
            throw rwsError;
        }
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
    checkRelEnabled(key) {
        return RelationUtils_1.RelationUtils.checkRelEnabled(this, key);
    }
    static setServices(services) {
        this.allModels = services.configService.get('db_models');
        this.services = services;
    }
    getDb() {
        return this.services.dbService;
    }
    static getDb() {
        return this.services.dbService;
    }
}
exports.RWSModel = RWSModel;
RWSModel.services = {};
RWSModel._collection = null;
RWSModel._RELATIONS = {};
RWSModel._BANNED_KEYS = ['_collection'];
RWSModel.allModels = [];
RWSModel._CUT_KEYS = [];
__decorate([
    (0, decorators_1.TrackType)(String),
    __metadata("design:type", String)
], RWSModel.prototype, "id", void 0);
