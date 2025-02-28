import { OpModelType } from "src/models/_model";
export interface IRWSCollectionOpts {
    relations?: {
        [key: string]: boolean;
    };
    ignored_keys?: string[];
}
export interface IRWSCollectionMeta {
    collectionName: string;
    options?: IRWSCollectionOpts;
}
export declare function RWSCollection(collectionName: string, options?: IRWSCollectionOpts): (target: OpModelType<any>) => void;
