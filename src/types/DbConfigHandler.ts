export interface IDbConfigParams {
    mongo_url: string;
    mongo_db: string;
}


export interface IDbConfigHandler {
    get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K];
}