export interface IDbOpts {
    dbOptions?: {
        mysql?: {
            useType?: string;
            useText?: boolean;
            maxLength?: number;
            useUuid?: boolean;
            params?: string[];
        };
        postgres?: {
            useText?: boolean;
            useUuid?: boolean;
            params?: string[];
        };
        mongodb?: {
            customType?: string;
            params?: string[];
        };
    };
}
