import { OpModelType } from "../models/_model";

export interface IDbConfigParams {
    mongo_url: string;
    mongo_db: string;
    db_models: OpModelType<any>[]
}

export interface IDbConfigHandler {
    get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K];
}