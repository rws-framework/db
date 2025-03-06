"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RWSModel = exports.TrackType = void 0;
const decorators_1 = require("../decorators");
Object.defineProperty(exports, "TrackType", { enumerable: true, get: function () { return decorators_1.TrackType; } });
const FieldsHelper_1 = require("../helper/FieldsHelper");
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
        this.checkForInclusionWithThrow();
    }
    static checkForInclusionWithThrow(checkModelType) {
        if (!this.checkForInclusion(this.name)) {
            throw new Error('Model undefined: ' + this.name);
        }
    }
    checkForInclusion() {
        return this.checkForInclusion();
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
        return !!this[key] && this[key] instanceof RWSModel;
    }
    bindRelation(key, relatedModel) {
        return {
            connect: {
                id: relatedModel.id
            }
        };
    }
    async _asyncFill(data, fullDataMode = false, allowRelations = true) {
        const collections_to_models = {};
        const timeSeriesIds = this.getTimeSeriesModelFields();
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
            for (const key in relManyData) {
                if (!fullDataMode && this.constructor._CUT_KEYS.includes(key)) {
                    continue;
                }
                const relMeta = relManyData[key];
                const relationEnabled = this.checkRelEnabled(relMeta.key);
                if (relationEnabled) {
                    this[relMeta.key] = await relMeta.inversionModel.findBy({
                        conditions: {
                            [relMeta.foreignKey]: data.id
                        },
                        allowRelations: false
                    });
                }
            }
            for (const key in relOneData) {
                if (!fullDataMode && this.constructor._CUT_KEYS.includes(key)) {
                    continue;
                }
                const relMeta = relOneData[key];
                const relationEnabled = this.checkRelEnabled(relMeta.key);
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
        return FieldsHelper_1.FieldsHelper.getAllClassFields(model)
            .filter(item => item.indexOf('TrackType') === 0)
            .map(item => item.split(':').at(-1));
    }
    getTimeSeriesModelFields() {
        const timeSeriesIds = {};
        for (const key in this) {
            if (this.hasOwnProperty(key)) {
                const meta = Reflect.getMetadata(`InverseTimeSeries:${key}`, this);
                if (meta) {
                    if (!timeSeriesIds[key]) {
                        timeSeriesIds[key] = {
                            collection: meta.timeSeriesModel,
                            hydrationField: meta.hydrationField,
                            ids: this[key]
                        };
                    }
                }
            }
        }
        return timeSeriesIds;
    }
    async getRelationOneMeta(classFields) {
        return RWSModel.getRelationOneMeta(this, classFields);
    }
    static async getRelationOneMeta(model, classFields) {
        const relIds = {};
        const relationFields = classFields
            .filter((item) => item.indexOf('Relation') === 0 && !item.includes('Inverse'))
            .map((item) => item.split(':').at(-1));
        for (const key of relationFields) {
            const metadataKey = `Relation:${key}`;
            const metadata = Reflect.getMetadata(metadataKey, model);
            if (metadata && metadata.promise) {
                const resolvedMetadata = await metadata.promise;
                if (!relIds[key]) {
                    relIds[key] = {
                        key: resolvedMetadata.key,
                        required: resolvedMetadata.required,
                        model: resolvedMetadata.relatedTo,
                        hydrationField: resolvedMetadata.relationField,
                        foreignKey: resolvedMetadata.relatedToField
                    };
                }
            }
        }
        return relIds;
    }
    async getRelationManyMeta(classFields) {
        return RWSModel.getRelationManyMeta(this, classFields);
    }
    static async getRelationManyMeta(model, classFields) {
        const relIds = {};
        const inverseFields = classFields
            .filter((item) => item.indexOf('InverseRelation') === 0)
            .map((item) => item.split(':').at(-1));
        for (const key of inverseFields) {
            const metadataKey = `InverseRelation:${key}`;
            const metadata = Reflect.getMetadata(metadataKey, model);
            if (metadata && metadata.promise) {
                const resolvedMetadata = await metadata.promise;
                if (!relIds[key]) {
                    relIds[key] = {
                        key: resolvedMetadata.key,
                        inversionModel: resolvedMetadata.inversionModel,
                        foreignKey: resolvedMetadata.foreignKey
                    };
                }
            }
        }
        return relIds;
    }
    async toMongo() {
        const data = {};
        const timeSeriesIds = this.getTimeSeriesModelFields();
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
            const timeSeriesModel = await Promise.resolve().then(() => __importStar(require('./TimeSeriesModel')));
            const isTimeSeries = this instanceof timeSeriesModel.default;
            updatedModelData = await this.dbService.insert(data, this.getCollection(), isTimeSeries);
            await this._asyncFill(updatedModelData);
            this.postCreate();
        }
        return this;
    }
    static async getModelAnnotations(constructor) {
        const annotationsData = {};
        const metadataKeys = Reflect.getMetadataKeys(constructor.prototype);
        // Process all metadata keys and collect promises
        const metadataPromises = metadataKeys.map(async (fullKey) => {
            const [annotationType, propertyKey] = fullKey.split(':');
            const metadata = Reflect.getMetadata(fullKey, constructor.prototype);
            if (metadata) {
                // If this is a relation metadata with a promise
                if (metadata.promise && (annotationType === 'Relation' || annotationType === 'InverseRelation')) {
                    const resolvedMetadata = await metadata.promise;
                    annotationsData[propertyKey] = {
                        annotationType,
                        metadata: resolvedMetadata
                    };
                }
                else {
                    // Handle non-relation metadata as before
                    const key = metadata.key || propertyKey;
                    annotationsData[key] = {
                        annotationType,
                        metadata
                    };
                }
            }
        });
        // Wait for all metadata to be processed
        await Promise.all(metadataPromises);
        return annotationsData;
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
        return baseClass.prototype.isPrototypeOf(constructor.prototype);
    }
    hasTimeSeries() {
        return RWSModel.checkTimeSeries(this.constructor);
    }
    static checkTimeSeries(constructor) {
        const data = constructor.prototype;
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (Reflect.getMetadata(`InverseTimeSeries:${key}`, constructor.prototype)) {
                    return true;
                }
            }
        }
        return false;
    }
    async isDbVariable(variable) {
        return RWSModel.checkDbVariable(this.constructor, variable);
    }
    static async checkDbVariable(constructor, variable) {
        if (variable === 'id') {
            return true;
        }
        const dbAnnotations = await RWSModel.getModelAnnotations(constructor);
        const dbProperties = Object.keys(dbAnnotations)
            .map((key) => { return { ...dbAnnotations[key], key }; })
            .filter((element) => element.annotationType === 'TrackType')
            .map((element) => element.key);
        return dbProperties.includes(variable);
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
            const dbData = await this.services.dbService.findBy(collection, conditions, fields, ordering, allowRelations);
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
        return Object.keys(this.constructor._RELATIONS).includes(key) && this.constructor._RELATIONS[key] === true;
    }
    static setServices(services) {
        this.allModels = services.configService.get('db_models');
        this.services = services;
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
