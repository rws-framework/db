import { DBService } from '../services/DBService';
import { IRWSModel } from '../types/IRWSModel';
import { IDbConfigHandler } from '../types/DbConfigHandler';
import { TrackType, IMetaOpts } from '../decorators';
import { FindByType } from '../types/FindParams';
interface IModel {
    [key: string]: any;
    id: string | null;
    save: () => void;
    getCollection: () => string | null;
    configService?: IDbConfigHandler;
    dbService?: DBService;
}
interface IRWSModelServices {
    configService?: IDbConfigHandler;
    dbService?: DBService;
}
type RelationBindType = {
    connect: {
        id: string;
    };
};
type RelOneMetaType<T extends IRWSModel> = {
    [key: string]: {
        required: boolean;
        key?: string;
        model: OpModelType<T>;
        hydrationField: string;
        foreignKey: string;
    };
};
type RelManyMetaType<T extends IRWSModel> = {
    [key: string]: {
        key: string;
        inversionModel: OpModelType<T>;
        foreignKey: string;
    };
};
export interface OpModelType<ChildClass> {
    new (data?: any | null): ChildClass;
    services: IRWSModelServices;
    name: string;
    _collection: string;
    _RELATIONS: {
        [key: string]: boolean;
    };
    _CUT_KEYS: string[];
    allModels: OpModelType<any>[];
    loadModels: () => OpModelType<any>[];
    checkForInclusionWithThrow: (className: string) => void;
    checkForInclusion: (className: string) => boolean;
    findOneBy<T extends RWSModel<T>>(this: OpModelType<T>, findParams: FindByType): Promise<T | null>;
    find<T extends RWSModel<T>>(this: OpModelType<T>, id: string, findParams?: Omit<FindByType, 'conditions'>): Promise<T | null>;
    findBy<T extends RWSModel<T>>(this: OpModelType<T>, findParams: FindByType): Promise<T[]>;
    delete<ChildClass extends RWSModel<ChildClass>>(this: OpModelType<ChildClass>, conditions: any): Promise<void>;
    create<T extends RWSModel<T>>(this: OpModelType<T>, data: T): Promise<T>;
    getRelationOneMeta(model: any, classFields: string[]): Promise<RelOneMetaType<IRWSModel>>;
    getRelationManyMeta(model: any, classFields: string[]): Promise<RelManyMetaType<IRWSModel>>;
    getCollection(): string;
    setServices(services: IRWSModelServices): void;
}
declare class RWSModel<ChildClass> implements IModel {
    static services: IRWSModelServices;
    [key: string]: any;
    id: string;
    static _collection: string;
    static _RELATIONS: {};
    static _BANNED_KEYS: string[];
    static allModels: OpModelType<any>[];
    static _CUT_KEYS: string[];
    constructor(data: any);
    checkForInclusionWithThrow(): void;
    static checkForInclusionWithThrow(this: OpModelType<any>, checkModelType: string): void;
    checkForInclusion(): boolean;
    static checkForInclusion(this: OpModelType<any>, checkModelType: string): boolean;
    _fill(data: any): RWSModel<ChildClass>;
    protected hasRelation(key: string): boolean;
    protected bindRelation(key: string, relatedModel: RWSModel<any>): RelationBindType;
    _asyncFill(data: any, fullDataMode?: boolean, allowRelations?: boolean): Promise<ChildClass>;
    private getModelScalarFields;
    private getTimeSeriesModelFields;
    private getRelationOneMeta;
    static getRelationOneMeta(model: any, classFields: string[]): Promise<RelOneMetaType<RWSModel<any>>>;
    private getRelationManyMeta;
    static getRelationManyMeta(model: any, classFields: string[]): Promise<RelManyMetaType<RWSModel<any>>>;
    toMongo(): Promise<any>;
    getCollection(): string | null;
    static getCollection(): string | null;
    save(): Promise<this>;
    static getModelAnnotations<T extends unknown>(constructor: new () => T): Promise<Record<string, {
        annotationType: string;
        metadata: any;
    }>>;
    preUpdate(): void;
    postUpdate(): void;
    preCreate(): void;
    postCreate(): void;
    static isSubclass<T extends RWSModel<T>, C extends new () => T>(constructor: C, baseClass: new () => T): boolean;
    hasTimeSeries(): boolean;
    static checkTimeSeries(constructor: any): boolean;
    isDbVariable(variable: string): Promise<boolean>;
    static checkDbVariable(constructor: any, variable: string): Promise<boolean>;
    sanitizeDBData(data: any): any;
    static watchCollection<ChildClass extends RWSModel<ChildClass>>(this: OpModelType<ChildClass>, preRun: () => void): Promise<any>;
    static findOneBy<ChildClass extends RWSModel<ChildClass>>(this: OpModelType<ChildClass>, findParams?: FindByType): Promise<ChildClass | null>;
    static find<ChildClass extends RWSModel<ChildClass>>(this: OpModelType<ChildClass>, id: string, findParams?: Omit<FindByType, 'conditions'>): Promise<ChildClass | null>;
    static findBy<ChildClass extends RWSModel<ChildClass>>(this: OpModelType<ChildClass>, findParams?: FindByType): Promise<ChildClass[]>;
    static delete<ChildClass extends RWSModel<ChildClass>>(this: OpModelType<ChildClass>, conditions: any): Promise<void>;
    delete<ChildClass extends RWSModel<ChildClass>>(): Promise<void>;
    static create<T extends RWSModel<T>>(this: new () => T, data: any): Promise<T>;
    static loadModels(): OpModelType<any>[];
    loadModels(): OpModelType<any>[];
    private checkRelEnabled;
    static setServices(services: IRWSModelServices): void;
}
export { IModel, TrackType, IMetaOpts, RWSModel };
