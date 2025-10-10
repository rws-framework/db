export type SortDirection = 'asc' | 'desc';
export type OrderByField = {
    [fieldName: string]: SortDirection;
};
export type OrderByArray = OrderByField[];
export type OrderByType = OrderByField | OrderByArray;
export type FindByType = {
    conditions?: any;
    ordering?: OrderByType;
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
