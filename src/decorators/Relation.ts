import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';

export type CascadingSetup = 'Cascade' | 'Restrict' | 'NoAction' | 'SetNull';

export interface IRelationOpts {
    required?: boolean
    key: string
    relationField: string
    relatedToField?: string
    mappingName?: string
    relatedTo: OpModelType<RWSModel<any>>
    many?: boolean
    embed?: boolean
    useUuid?: boolean
    relationName?: string
    cascade?: {
        onDelete?: CascadingSetup,
        onUpdate?: CascadingSetup
    }
}

const _DEFAULT_CASCADE = { onDelete: 'SetNull', onUpdate: 'Cascade' };

const _DEFAULTS: Partial<IRelationOpts> = { required: false, many: false, embed: false, cascade: null};
  
function Relation(theModel: () => OpModelType<RWSModel<any>>, relationOptions: Partial<IRelationOpts> = _DEFAULTS) {
    return function(target: any, key: string) {
        // Store the factory lazily — do NOT call theModel() here.
        // Calling it eagerly via Promise.resolve().then() races with module
        // initialisation: in Jest globalSetup (which uses dynamic import()),
        // microtasks can fire before all circular-dependency modules have
        // finished loading, so theModel() may return undefined at that point.
        // getModelAnnotations() calls the factory only when it is actually
        // needed, by which time every module is guaranteed to be loaded.
        Reflect.defineMetadata(`Relation:${key}`, {
            factory: theModel,
            options: { ...relationOptions },
            key
        }, target);
    };
}


export default Relation;

