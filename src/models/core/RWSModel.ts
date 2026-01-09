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
    
    // Store relation foreign key fields for reload() functionality
    private _relationFields: Record<string, any> = {};

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

        // Check if relations are already populated from Prisma includes
        const relationsAlreadyPopulated = this.checkRelationsPrePopulated(data, relOneData, relManyData);

        if (allowRelations && !relationsAlreadyPopulated) {
            // Use traditional relation hydration if not pre-populated
            await HydrateUtils.hydrateRelations(this, relManyData, relOneData, seriesHydrationfields, fullDataMode, data);
        } else if (allowRelations && relationsAlreadyPopulated) {
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
        
        // Get relation metadata to determine how to handle each relation
        const classFields = FieldsHelper.getAllClassFields(this.constructor);
        const relOneData = await this.getRelationOneMeta(classFields);
      
        for (const key in (this as any)) { 
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
                        } else if (this[key] && this[key].id) {
                            data[key] = { connect: { id: this[key].id } };                            
                        }
                    } else {
                        // Simple optional relations → use foreign key field directly
                        const foreignKeyField = relationMeta.hydrationField;
                        if (this[key] === null) {
                            data[foreignKeyField] = null;
                        } else if (this[key] && this[key].id) {
                            data[foreignKeyField] = this[key].id;
                        }
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

    /**
     * Build Prisma include object for relation preloading
     */
    public static async buildPrismaIncludes<T extends RWSModel<T>>(this: OpModelType<T>, fields?: string[]): Promise<any> {
        const tempInstance = new this();
        const classFields = FieldsHelper.getAllClassFields(this);
        
        const [relOneData, relManyData] = await Promise.all([
            this.getRelationOneMeta(tempInstance, classFields),
            this.getRelationManyMeta(tempInstance, classFields)
        ]);

        // Get relations configuration from @RWSCollection decorator
        const allowedRelations = this._RELATIONS || {};
        const hasRelationsConfig = Object.keys(allowedRelations).length > 0;

        const includes: any = {};
        
        // Helper function to determine if a relation should be included
        const shouldIncludeRelation = (relationName: string): boolean => {
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
    private checkRelationsPrePopulated(data: any, relOneData: any, relManyData: any): boolean {
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
            } else if (relationValue && Array.isArray(relationValue) && relationValue.length > 0) {
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
    private async hydratePrePopulatedRelations(data: any, relOneData: any, relManyData: any): Promise<void> {
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
                        // Respect ignored_keys from child model
                        const childIgnoredKeys = (ModelClass as OpModelType<any>)._CUT_KEYS || [];
                        const relatedInstance = new ModelClass();
                        
                        // Filter relationData to exclude ignored keys
                        const filteredData = { ...relationData };
                        for (const ignoredKey of childIgnoredKeys) {
                            delete filteredData[ignoredKey];
                        }
                        
                        await relatedInstance._asyncFill(filteredData, false, false, true);
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
                            const childIgnoredKeys = (ModelClass as OpModelType<any>)._CUT_KEYS || [];
                            const relatedInstance = new ModelClass();
                            
                            // Check relation metadata to identify foreign key fields that need to be preserved
                            const tempInstance = new ModelClass();
                            const childClassFields = FieldsHelper.getAllClassFields(tempInstance.constructor);
                            const [childRelOneData, childRelManyData] = await Promise.all([
                                RelationUtils.getRelationOneMeta(tempInstance, childClassFields),
                                RelationUtils.getRelationManyMeta(tempInstance, childClassFields)
                            ]);
                            
                            // Store foreign key fields from relation metadata
                            for (const relKey in childRelOneData) {
                                const relMeta = childRelOneData[relKey];
                                const foreignKeyField = relMeta.hydrationField; // e.g., 'avatar_id', 'knowledge_id'
                                if (foreignKeyField && relationData[foreignKeyField] !== undefined) {
                                    relatedInstance._relationFields[foreignKeyField] = relationData[foreignKeyField];
                                    relatedInstance[foreignKeyField] = relationData[foreignKeyField];
                                }
                            }
                            
                            for (const relKey in childRelManyData) {
                                const relMeta = childRelManyData[relKey];
                                const foreignKeyField = relMeta.foreignKey; // Use foreignKey for inverse relations
                                if (foreignKeyField && relationData[foreignKeyField] !== undefined) {
                                    relatedInstance._relationFields[foreignKeyField] = relationData[foreignKeyField];
                                    relatedInstance[foreignKeyField] = relationData[foreignKeyField];
                                }
                            }
                            
                            // Filter relationData to exclude ignored keys
                            const filteredData = { ...relationData };
                            for (const ignoredKey of childIgnoredKeys) {
                                delete filteredData[ignoredKey];
                            }
                            
                            await relatedInstance._asyncFill(filteredData, false, false, true);
                            this[key] = relatedInstance;
                        }
                    } else if (Array.isArray(relationData) && relationData.length > 0) {
                        // Handle regular one-to-many relations as arrays
                        const relatedInstances = [];
                        for (const itemData of relationData) {
                            if (typeof itemData === 'object' && itemData !== null) {
                                const childIgnoredKeys = (ModelClass as OpModelType<any>)._CUT_KEYS || [];
                                const relatedInstance = new ModelClass();
                                
                                // Check relation metadata to identify foreign key fields that need to be preserved
                                const tempInstance = new ModelClass();
                                const childClassFields = FieldsHelper.getAllClassFields(tempInstance.constructor);
                                const [childRelOneData, childRelManyData] = await Promise.all([
                                    RelationUtils.getRelationOneMeta(tempInstance, childClassFields),
                                    RelationUtils.getRelationManyMeta(tempInstance, childClassFields)
                                ]);
                                
                                // Store foreign key fields from relation metadata
                                for (const relKey in childRelOneData) {
                                    const relMeta = childRelOneData[relKey];
                                    const foreignKeyField = relMeta.hydrationField; // e.g., 'avatar_id', 'knowledge_id'
                                    if (foreignKeyField && itemData[foreignKeyField] !== undefined) {
                                        relatedInstance._relationFields[foreignKeyField] = itemData[foreignKeyField];
                                        relatedInstance[foreignKeyField] = itemData[foreignKeyField];
                                    }
                                }
                                
                                for (const relKey in childRelManyData) {
                                    const relMeta = childRelManyData[relKey];
                                    const foreignKeyField = relMeta.foreignKey; // Use foreignKey for inverse relations
                                    if (foreignKeyField && itemData[foreignKeyField] !== undefined) {
                                        relatedInstance._relationFields[foreignKeyField] = itemData[foreignKeyField];
                                        relatedInstance[foreignKeyField] = itemData[foreignKeyField];
                                    }
                                }
                                
                                // Filter itemData to exclude ignored keys
                                const filteredData = { ...itemData };
                                for (const ignoredKey of childIgnoredKeys) {
                                    delete filteredData[ignoredKey];
                                }
                                
                                await relatedInstance._asyncFill(filteredData, false, false, true);
                                relatedInstances.push(relatedInstance);
                            }
                        }
                        this[key] = relatedInstances;
                    }
                }
            }
        }
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
        
        // Get ignored keys from model's @RWSCollection decorator
        const ignoredKeys = ((this.constructor as OpModelType<any>)._CUT_KEYS || []);
        let fields: string[] | undefined = undefined;
        
        // Build fields list excluding ignored ones if there are ignored keys
        if (ignoredKeys.length > 0) {
            // Get proper database fields from model annotations
            const annotations = await ModelUtils.getModelAnnotations(this.constructor as OpModelType<any>);
            
            // Get scalar fields (TrackType decorated fields)
            const scalarFields = ModelUtils.getModelScalarFields(this);
            
            // Get relation fields from annotations
            const relationFields = Object.keys(annotations).filter(key => 
                annotations[key].annotationType === 'Relation' || 
                annotations[key].annotationType === 'InverseRelation'
            );
            
            // Combine all database fields
            const allDbFields = [...scalarFields, ...relationFields];
            
            // Filter out ignored keys
            fields = allDbFields.filter(field => !ignoredKeys.includes(field));
            
            // Always include id if not ignored
            if (!fields.includes('id') && !ignoredKeys.includes('id')) {
                fields.push('id');
            }
        }
        
        // Find the fresh data from database with field filtering
        const freshData = await FindUtils.findOneBy(this.constructor as OpModelType<any>, { 
            conditions: where,
            fields: fields
        });
        
        if (!freshData) {
            return null;
        }
        
        // Convert the fresh instance back to plain data for hydration
        const plainData = await freshData.toMongo();
        
        // Preserve foreign key fields from _relationFields to ensure relations can be hydrated
        for (const key in this._relationFields) {
            if (plainData[key] === undefined) {
                plainData[key] = this._relationFields[key];
            }
        }
        
        // Hydrate current instance with fresh data including relations
        await this._asyncFill(plainData, true, true, true);
        
        return this;
    }
    
    // Helper method to get property with fallback to stored relation fields
    getPropertyValue(key: string): any {
        if (this.hasOwnProperty(key) || this[key] !== undefined) {
            return this[key];
        }
        return this._relationFields[key];
    }
}

export { RWSModel };
