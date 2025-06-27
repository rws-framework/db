export type FindByType = {
    conditions?: any;
    ordering?: {
        [fieldName: string]: string;
    };
    fields?: string[];
    allowRelations?: boolean;
    fullData?: boolean;
    pagination?: IPaginationParams;
    cancelPostLoad?: boolean;
};
export interface IPaginationParams {
    page: number;
    per_page?: number;
}
