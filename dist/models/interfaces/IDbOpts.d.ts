export interface IDbOpts {
    dbOptions?: {
        mysql?: {
            useType?: string;
            useText?: boolean;
            maxLength?: number;
            useUuid?: boolean;
            params?: string[];
            extraTypeParams?: string[];
        };
        postgres?: {
            useType?: string;
            useText?: boolean;
            maxLength?: number;
            useUuid?: boolean;
            params?: string[];
            extraTypeParams?: string[];
        };
        mongodb?: {
            customType?: string;
            params?: string[];
        };
    };
}
