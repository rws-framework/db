import { IModel } from '../interfaces/IModel';
import { IRWSModelServices } from '../interfaces/IRWSModelServices';
import { OpModelType } from '../interfaces/OpModelType';
import { TrackType } from '../../decorators';
import { FieldsHelper } from '../../helper/FieldsHelper';
import { FindByType, IPaginationParams } from '../../types/FindParams';
import { RelationUtils } from '../utils/RelationUtils';

import { TimeSeriesUtils } from '../utils/TimeSeriesUtils';
import { ModelUtils } from '../utils/ModelUtils';
// import timeSeriesModel from './TimeSeriesModel';      
import { DBService } from '../../services/DBService';
import { ISuperTagData } from '../../decorators/RWSCollection';
import { HydrateUtils } from '../utils/HydrateUtils';
import { FindUtils } from '../utils/FindUtils';

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

    private postLoadExecuted: boolean = false;

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
    
    isPostLoadExecuted(): boolean
    {
        return this.postLoadExecuted;
    }

    setPostLoadExecuted(){
        this.postLoadExecuted = true;
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

    protected async hasRelation(key: string): Promise<boolean> {
        return RelationUtils.hasRelation((this as any).constructor, key);
    }

    protected async getRelationKey(key: string): Promise<string> {
        return RelationUtils.getRelationKey((this as any).constructor, key);
    }   

    protected bindRelation(key: string, relatedModel: RWSModel<any>): { connect: { id: string | number } } {        
        return RelationUtils.bindRelation(relatedModel);
    }

    public async _asyncFill(data: any, fullDataMode = false, allowRelations = true, postLoadExecute = true): Promise<T> {        
        const collections_to_models: {[key: string]: any} = {};               
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
            await HydrateUtils.hydrateRelations(this, relManyData, relOneData, seriesHydrationfields, fullDataMode, data);
        }
    
        // Process regular fields and time series
        await HydrateUtils.hydrateDataFields(this, collections_to_models, relOneData, seriesHydrationfields, fullDataMode, data);
    
        if(!this.isPostLoadExecuted() && postLoadExecute){
            await this.postLoad();
            this.setPostLoadExecuted();
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
        return await FindUtils.paginate(this, paginateParams, findParams);
    }

    public async toMongo(): Promise<any> {
        const data: any = {};
        const timeSeriesIds = TimeSeriesUtils.getTimeSeriesModelFields(this);
        const timeSeriesHydrationFields: string[] = [];
      
        for (const key in (this as any)) { 
            if (await this.hasRelation(key)) {                
                data[key] = this.bindRelation(key, this[key]);  
                
                if(data[key] === null){
                    const relationKey = await this.getRelationKey(key);
                    if(relationKey){
                        data[relationKey] = null;
                        delete data[key];
                    }
                }            
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

        const entryExists = await ModelUtils.entryExists(this);        

        if (entryExists) {
            await this.preUpdate();

            const pk = ModelUtils.findPrimaryKeyFields(this.constructor as OpModelType<any>);

            updatedModelData = await this.dbService.update(data, this.getCollection(), pk);

            await this._asyncFill(updatedModelData);
            await this.postUpdate();
        } else {
            await this.preCreate();      
      
            const isTimeSeries = false;//this instanceof timeSeriesModel;

            updatedModelData = await this.dbService.insert(data, this.getCollection(), isTimeSeries);      

            await this._asyncFill(updatedModelData);   

            await this.postCreate();
        }
  
        return this;
    }

    static async getModelAnnotations<T extends unknown>(constructor: new () => T): Promise<Record<string, {annotationType: string, metadata: any}>> {    
        return ModelUtils.getModelAnnotations(constructor);
    }

    public async preUpdate(): Promise<void> {
        return;
    }

    public async postLoad(): Promise<void> {
        return;
    }

    public async postUpdate(): Promise<void> {
        return;
    }

    public async preCreate(): Promise<void> {
        return;
    }

    public async postCreate(): Promise<void> {
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
        return await FindUtils.findOneBy(this, findParams);
    }

    public static async find<T extends RWSModel<T>>(
        this: OpModelType<T>,
        id: string | number,        
        findParams: Omit<FindByType, 'conditions'> = null
    ): Promise<T | null> {        
        return await FindUtils.find(this, id, findParams)
    }   
    
    public static async findBy<T extends RWSModel<T>>(
        this: OpModelType<T>,    
        findParams?: FindByType
    ): Promise<T[]> {
        return await FindUtils.findBy(this, findParams);                
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

    public static async count(where: {[k: string]: any} = {}): Promise<number>{
        return await this.services.dbService.count(this as OpModelType<any>, where);
    }

    public static getDb(): DBService
    {
        return this.services.dbService;
    }

    public async reload(): Promise<RWSModel<T> | null>
    {
        const pk = ModelUtils.findPrimaryKeyFields(this.constructor as OpModelType<T>);
        const where: any = {};
                    
        if(Array.isArray(pk)){            
            for(const pkElem of pk){
                where[pkElem] = this[pkElem];
            }
        }else{
            where[pk as string] = this[pk as string]
        }         
        
        return await FindUtils.findOneBy(this.constructor as OpModelType<any>, { conditions: where });
    }
}

export { RWSModel };
