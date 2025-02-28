import { OpModelType } from "src/models/_model";

export interface IRWSCollectionOpts {
    relations?: {
        [key: string]: boolean
    },
    ignored_keys?: string[]
}

export interface IRWSCollectionMeta {
    collectionName: string,
    options?: IRWSCollectionOpts
}

  
export function RWSCollection(collectionName: string, options?: IRWSCollectionOpts) {
    const metaOpts: IRWSCollectionMeta = { collectionName, options };
    return function(target: OpModelType<any>) {     
        target._collection = collectionName;
        if(options && options.relations){
            target._RELATIONS = options.relations;
        }
        if(options && options.ignored_keys){
            target._CUT_KEYS = options.ignored_keys;
        }
        Reflect.defineMetadata(`RWSCollection`, metaOpts, target);
    };
} 