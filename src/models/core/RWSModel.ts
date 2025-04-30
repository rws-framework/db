import { IModel } from '../interfaces/IModel';
import { IRWSModelServices } from '../interfaces/IRWSModelServices';
import { OpModelType } from '../interfaces/OpModelType';
import { TrackType, ITrackerMetaOpts } from '../../decorators';
import { FieldsHelper } from '../../helper/FieldsHelper';
import { FindByType, IPaginationParams } from '../../types/FindParams';
import { RelationUtils } from '../utils/RelationUtils';

import { TimeSeriesUtils } from '../utils/TimeSeriesUtils';
import { ModelUtils } from '../utils/ModelUtils';
// import timeSeriesModel from './TimeSeriesModel';      
import { DBService } from '../../services/DBService';
import { ISuperTagData } from '../../decorators/RWSCollection';

class RWSModel<T> implements IModel {
    static services: IRWSModelServices = {};
    
    [key: string]: any;
    @TrackType(String)
    id: string | number;
    static _collection: string = null;
    static _RELATIONS = {};
    static _NO_ID = false;
    static _SUPER_TAGS: ISuperTagData[] = [];
    static _BANNED_KEYS = ['_collection'];
    static allModels: OpModelType<any>[] = [];
    static _CUT_KEYS: string[] = [];

    constructor(data: any = null) {    
        if(!this.getCollection()){
            throw new Error('Model must have a collection defined');
        }

        this.dbService = RWSModel.services.dbService;
        this.configService = RWSModel.services.configService;

        if(!data){
            return;    
        }          
  
        if(!this.hasTimeSeries()){
            this._fill(data);
        }else{
            throw new Error('Time Series not supported in synchronous constructor. Use `await Model.create(data)` static method to instantiate this model.');
        }
    }    
    
    checkForInclusionWithThrow(): void {
        const constructor = this.constructor as OpModelType<any>;
        if(!constructor.checkForInclusion(constructor.name)){
            throw new Error('Model undefined: ' + constructor.name);
        }
    }

    static checkForInclusionWithThrow(this: OpModelType<any>, checkModelType: string): void {
        if(!this.checkForInclusion(this.name)){
            throw new Error('Model undefined: ' + this.name);
        }
    }

    checkForInclusion(): boolean {                
        const constructor = this.constructor as OpModelType<any>;
        return constructor.checkForInclusion(constructor.name);        
    }

    static checkForInclusion(this: OpModelType<any>, checkModelType: string): boolean {        
        return this.loadModels().find((definedModel: OpModelType<any>) => {
            return definedModel.name === checkModelType;
        }) !== undefined;
    }

    protected _fill(data: any): RWSModel<T> {
        for (const key in data) {
            if (data.hasOwnProperty(key)) {   
              
                const meta = Reflect.getMetadata(`InverseTimeSeries:${key}`, (this as any).constructor.prototype);
          
                if(meta){
                    data[key] = {
                        create: data[key]
                    };
                }else{
                    this[key] = data[key];
                }                          
            }
        }       
        
        return this;
    }

    protected hasRelation(key: string): boolean {
        return RelationUtils.hasRelation(this, key);
    }

    protected bindRelation(key: string, relatedModel: RWSModel<any>): { connect: { id: string | number } } {        
        return RelationUtils.bindRelation(relatedModel);
    }

    public async _asyncFill(data: any, fullDataMode = false, allowRelations = true): Promise<T> {
        const collections_to_models: {[key: string]: any} = {};           
        const timeSeriesIds = TimeSeriesUtils.getTimeSeriesModelFields(this);
    
        const classFields = FieldsHelper.getAllClassFields(this.constructor);        
    
        // Get both relation metadata types asynchronously
        const [relOneData, relManyData] = await Promise.all([
            this.getRelationOneMeta(classFields),
            this.getRelationManyMeta(classFields)
        ]);        
    
        this.loadModels().forEach((model) => {
            collections_to_models[model.getCollection()] = model;      
        });      
    
        const seriesHydrationfields: string[] = []; 


        if (allowRelations) {
            // Handle many-to-many relations
            for (const key in relManyData) { 
                if(!fullDataMode && (this as any).constructor._CUT_KEYS.includes(key)){
                    continue;
                }

                const relMeta = relManyData[key];  
        
                const relationEnabled = !RelationUtils.checkRelDisabled(this, relMeta.key);
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
                if(!fullDataMode && (this as any).constructor._CUT_KEYS.includes(key)){
                    continue;
                }

                const relMeta = relOneData[key];          
                const relationEnabled = !RelationUtils.checkRelDisabled(this, relMeta.key);
                
                if(!data[relMeta.hydrationField] && relMeta.required){
                    throw new Error(`Relation field "${relMeta.hydrationField}" is required in model ${this.constructor.name}.`)
                }
                
                if (relationEnabled && data[relMeta.hydrationField]) {        
                    this[relMeta.key] = await relMeta.model.find(data[relMeta.hydrationField], { allowRelations: false });    
                }                                
                else if(relationEnabled && !data[relMeta.hydrationField] && data[relMeta.key]){                    
                    const newRelModel: RWSModel<any> = await relMeta.model.create(data[relMeta.key]);                    
                    this[relMeta.key] = await newRelModel.save();
                }

                const cutKeys = ((this.constructor as any)._CUT_KEYS as string[]);

                const trackedField = Object.keys((await ModelUtils.getModelAnnotations(this.constructor as any))).includes(relMeta.hydrationField);
                
                if(!cutKeys.includes(relMeta.hydrationField) && !trackedField){
                    cutKeys.push(relMeta.hydrationField)
                }
            }
        }
    
        // Process regular fields and time series
        for (const key in data) {         
            if (data.hasOwnProperty(key)) {                   
                if(!fullDataMode && (this as any).constructor._CUT_KEYS.includes(key)){
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
                } else {
                    this[key] = data[key];            
                }        
            }       
        }     
    
        return this as any as T;
    }    

    private getModelScalarFields(model: RWSModel<T>): string[] {
        return ModelUtils.getModelScalarFields(model);
    }

    private async getRelationOneMeta(classFields: string[]) {
        return RelationUtils.getRelationOneMeta(this, classFields);
    }

    static async getRelationOneMeta(model: any, classFields: string[]) {
        return RelationUtils.getRelationOneMeta(model, classFields);
    }

    private async getRelationManyMeta(classFields: string[]) {
        return RelationUtils.getRelationManyMeta(this, classFields);
    }

    static async getRelationManyMeta(model: any, classFields: string[]) {
        return RelationUtils.getRelationManyMeta(model, classFields);
    }

    public static async paginate<T extends RWSModel<T>>(
        this: OpModelType<T>,  
        paginateParams: IPaginationParams,  
        findParams?: FindByType
    ): Promise<T[]> {
        const conditions = findParams?.conditions ?? {};
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;

        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        try {
            const dbData = await this.services.dbService.findBy(collection, conditions, fields, ordering, paginateParams);   
            if (dbData.length) {
                const instanced: T[] = [];
        
                for (const data of dbData) { 
                    const inst: T = new (this as { new(): T })();
                    instanced.push((await inst._asyncFill(data, fullData,allowRelations)) as T);
                }
        
                return instanced;
            }
        
            return [];
        } catch (rwsError: Error | any) {
            console.error(rwsError);

            throw rwsError;
        }                 
    }

    public async toMongo(): Promise<any> {
        const data: any = {};
        const timeSeriesIds = TimeSeriesUtils.getTimeSeriesModelFields(this);
        const timeSeriesHydrationFields: string[] = [];
      
        for (const key in (this as any)) { 
            if (this.hasRelation(key)) {                
                data[key] = this.bindRelation(key, this[key]);                
                continue;
            }
    
            if (!(await this.isDbVariable(key))) {
                continue;
            } 
    
            const passedFieldCondition: boolean = this.hasOwnProperty(key) && 
                !((this as any).constructor._BANNED_KEYS 
                    || RWSModel._BANNED_KEYS
                ).includes(key) && 
                !timeSeriesHydrationFields.includes(key)
            ;
    
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

    getCollection(): string | null {
        return (this as any).constructor._collection || this._collection;
    }

    static getCollection(): string | null {
        return (this as any).constructor._collection || this._collection;
    }

    async save(): Promise<this> {
        const data = await this.toMongo();
        let updatedModelData = data;         
        if (this.id) {
            this.preUpdate();

            updatedModelData = await this.dbService.update(data, this.getCollection());

            await this._asyncFill(updatedModelData);
            this.postUpdate();
        } else {
            this.preCreate();      
      
            const isTimeSeries = false;//this instanceof timeSeriesModel;

            updatedModelData = await this.dbService.insert(data, this.getCollection(), isTimeSeries);      

            await this._asyncFill(updatedModelData);   

            this.postCreate();
        }
  
        return this;
    }

    static async getModelAnnotations<T extends unknown>(constructor: new () => T): Promise<Record<string, {annotationType: string, metadata: any}>> {    
        return ModelUtils.getModelAnnotations(constructor);
    }

    public preUpdate(): void {
        return;
    }

    public postUpdate(): void {
        return;
    }

    public preCreate(): void {
        return;
    }

    public postCreate(): void {
        return;
    }

    public static isSubclass<T extends RWSModel<T>, C extends new () => T>(constructor: C, baseClass: new () => T): boolean {
        return ModelUtils.isSubclass(constructor, baseClass);
    }

    hasTimeSeries(): boolean {
        return TimeSeriesUtils.checkTimeSeries((this as any).constructor);
    }

    static checkTimeSeries(constructor: any): boolean {
        return TimeSeriesUtils.checkTimeSeries(constructor);
    }

    async isDbVariable(variable: string): Promise<boolean> {
        return ModelUtils.checkDbVariable((this as any).constructor, variable);
    }

    static async checkDbVariable(constructor: any, variable: string): Promise<boolean> {
        return ModelUtils.checkDbVariable(constructor, variable);
    }

    sanitizeDBData(data: any): any {
        const dataKeys = Object.keys(data);
        const sanitizedData: {[key: string]: any} = {};

        for (const key of dataKeys){
            if(this.isDbVariable(key)){
                sanitizedData[key] = data[key];
            }
        }

        return sanitizedData;
    }

    public static async watchCollection<T extends RWSModel<T>>(
        this: OpModelType<T>, 
        preRun: () => void
    ){
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        return await this.services.dbService.watchCollection(collection, preRun);
    }

    public static async findOneBy<T extends RWSModel<T>>(
        this: OpModelType<T>,
        findParams?: FindByType
    ): Promise<T | null> {
        const conditions = findParams?.conditions ?? {};
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;

        this.checkForInclusionWithThrow('');

        
        const collection = Reflect.get(this, '_collection');        
        const dbData = await this.services.dbService.findOneBy(collection, conditions, fields, ordering, allowRelations);
        
    
        if (dbData) {
            const inst: T = new (this as { new(): T })();
            return await inst._asyncFill(dbData, fullData, allowRelations);
        }
    
        return null;
    }

    public static async find<T extends RWSModel<T>>(
        this: OpModelType<T>,
        id: string | number,        
        findParams: Omit<FindByType, 'conditions'> = null
    ): Promise<T | null> {        
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;          
        const fullData = findParams?.fullData ?? false;

        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);

        const dbData = await this.services.dbService.findOneBy(collection, { id }, fields, ordering, allowRelations);
    
        if (dbData) {            
            const inst: T = new (this as { new(): T })();
            return await inst._asyncFill(dbData, fullData, allowRelations);
        }
    
        return null;
    }   
    
    public static async findBy<T extends RWSModel<T>>(
        this: OpModelType<T>,    
        findParams?: FindByType
    ): Promise<T[]> {
        const conditions = findParams?.conditions ?? {};
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;

        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        try {
            const dbData = await this.services.dbService.findBy(collection, conditions, fields, ordering);        

            if (dbData.length) {
                const instanced: T[] = [];
        
                for (const data of dbData) { 
                    const inst: T = new (this as { new(): T })();

                    instanced.push((await inst._asyncFill(data, fullData,allowRelations)) as T);
                }
        
                return instanced;
            }
        
            return [];
        } catch (rwsError: Error | any) {
            console.error(rwsError);

            throw rwsError;
        }                 
    }

    public static async delete<T extends RWSModel<T>>(
        this: OpModelType<T>,
        conditions: any
    ): Promise<void> {
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);         
        return await this.services.dbService.delete(collection, conditions);
    }

    public async delete<T extends RWSModel<T>>(): Promise<void> {
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow();
        return await this.dbService.delete(collection, {
            id: this.id
        });  
    }    
    
    static async create<T extends RWSModel<T>>(this: new () => T, data: any): Promise<T> {
        const newModel = new this();

        const sanitizedData = newModel.sanitizeDBData(data);
     
        await newModel._asyncFill(sanitizedData);
    
        return newModel;
    }

    static loadModels(): OpModelType<any>[] {                        
        return this.allModels || [];
    }

    loadModels(): OpModelType<any>[] {             
        return RWSModel.loadModels();
    }

    private checkRelDisabled(key: string): boolean {
        return RelationUtils.checkRelDisabled(this, key);
    }

    public static setServices(services: IRWSModelServices){
        this.allModels = services.configService.get('db_models');  
        this.services = services;
    }

    public getDb(): DBService
    {
        return this.services.dbService;
    }

    public static getDb(): DBService
    {
        return this.services.dbService;
    }
}

export { RWSModel };
