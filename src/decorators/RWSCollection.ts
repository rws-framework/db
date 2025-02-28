export interface IRWSCollectionOpts {
    relations?: {
        [key: string]: boolean
    }
}

export interface IRWSCollectionMeta {
    collectionName: string,
    options?: IRWSCollectionOpts
}

  
export function RWSCollection(collectionName: string, options?: IRWSCollectionOpts) {
    const metaOpts: IRWSCollectionMeta = { collectionName, options };
    return function(target: any) {     
        target._collection = collectionName;
        Reflect.defineMetadata(`RWSCollection`, metaOpts, target);
    };
} 