/**
 * Manages database relations for schema generation
 */
export declare class RelationManager {
    private static allRelations;
    /**
     * Mark a relation between two models
     * @param relationKey A unique key for the relation
     * @param inverse Whether this is an inverse relation
     */
    static markRelation(relationKey: string, inverse?: boolean): void;
    /**
     * Complete a relation between two models
     * @param relationKey A unique key for the relation
     * @param index The index of the relation
     * @param inverse Whether this is an inverse relation
     */
    static completeRelation(relationKey: string, index: number, inverse?: boolean): void;
    /**
     * Get a unique counter for a relation between two models
     * @param relationKey A unique key for the relation
     * @param inverse Whether this is an inverse relation
     * @returns A unique counter for this relation
     */
    static getRelationCounter(relationKey: string, inverse?: boolean): number;
    /**
     * Generate a shortened relation name to stay within database limits
     * @param modelName The name of the model
     * @param relatedModelName The name of the related model
     * @param index The index of the relation
     * @returns A shortened relation name
     */
    static getShortenedRelationName(modelName: string, relatedModelName: string, index: number): string;
    /**
     * Reset all relations (useful for testing)
     */
    static resetRelations(): void;
    /**
     * Get all relations (useful for debugging)
     */
    static getAllRelations(): Map<string, {
        base: boolean | null;
        inversion: boolean | null;
    }[]>;
}
