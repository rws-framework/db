export interface IDbOpts {
    dbOptions?: {
        mysql?: {
            useType?: string;
            useText?: boolean;
            maxLength?: number;
            useUuid?: boolean;
        };
        postgres?: {
            useText?: boolean;
            useUuid?: boolean;
        };
        mongodb?: {
            customType?: string;
        };
    };
}
