import { OpModelType } from "../models/_model";


//@todo Replace with source
export interface ISuperTagData {
    tagType: string,
    fields: string[],
    map: string
}

export interface IRWSCollectionOpts {
    relations?: {
        [key: string]: boolean
    },
    ignored_keys?: string[],
    noId?: boolean,
    superTags?: ISuperTagData[]
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

        if(options && options.noId){
            target._NO_ID = options.noId;
        }

        if(options && options.superTags && options.superTags.length){
            target._SUPER_TAGS = options.superTags;
        }

        Reflect.defineMetadata(`RWSCollection`, metaOpts, target);
    };
} 