export type FindByType = {
    conditions?: any;
    ordering?: {
        [fieldName: string]: string;
    };
    fields?: string[];
    allowRelations?: boolean;
    fullData?: boolean;
};
