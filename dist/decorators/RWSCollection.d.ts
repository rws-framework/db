export interface IRWSCollectionOpts {
    relations?: {
        [key: string]: boolean;
    };
}
export interface IRWSCollectionMeta {
    collectionName: string;
    options?: IRWSCollectionOpts;
}
export declare function RWSCollection(collectionName: string, options?: IRWSCollectionOpts): (target: any) => void;
