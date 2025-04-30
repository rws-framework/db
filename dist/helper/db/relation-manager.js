"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationManager = void 0;
/**
 * Manages database relations for schema generation
 */
class RelationManager {
    /**
     * Mark a relation between two models
     * @param relationKey A unique key for the relation
     * @param inverse Whether this is an inverse relation
     */
    static markRelation(relationKey, inverse = false) {
        if (!this.allRelations.has(relationKey)) {
            this.allRelations.set(relationKey, []);
        }
        const modelRelations = this.allRelations.get(relationKey);
        let marked = false;
        for (const relationInfo of modelRelations) {
            if ((relationInfo.base !== null && !inverse) || (relationInfo.inversion !== null && inverse)) {
                continue;
            }
            if (inverse) {
                relationInfo.inversion = false;
                marked = true;
            }
            else {
                relationInfo.base = false;
                marked = true;
            }
            return;
        }
        if (!marked) {
            modelRelations.push({ base: inverse ? null : false, inversion: inverse ? false : null });
        }
    }
    /**
     * Complete a relation between two models
     * @param relationKey A unique key for the relation
     * @param index The index of the relation
     * @param inverse Whether this is an inverse relation
     */
    static completeRelation(relationKey, index, inverse = false) {
        const modelRelations = this.allRelations.get(relationKey);
        if (inverse) {
            modelRelations[index].inversion = true;
        }
        else {
            modelRelations[index].base = true;
        }
    }
    /**
     * Get a unique counter for a relation between two models
     * @param relationKey A unique key for the relation
     * @param inverse Whether this is an inverse relation
     * @returns A unique counter for this relation
     */
    static getRelationCounter(relationKey, inverse = false) {
        let counter = 0;
        for (const relationInfo of this.allRelations.get(relationKey)) {
            if ((relationInfo.base === true && !inverse) || (relationInfo.inversion === true && inverse)) {
                counter++;
            }
        }
        return counter;
    }
    /**
     * Generate a shortened relation name to stay within database limits
     * @param modelName The name of the model
     * @param relatedModelName The name of the related model
     * @param index The index of the relation
     * @returns A shortened relation name
     */
    static getShortenedRelationName(modelName, relatedModelName, index) {
        const fullRelationName = `${modelName}_${relatedModelName}_${index}`.toLowerCase();
        if (fullRelationName.length <= 64) {
            return fullRelationName;
        }
        const extraChars = 2 + String(index).length;
        const availableChars = 64 - extraChars;
        const modelNameLength = modelName.length;
        const relatedModelNameLength = relatedModelName.length;
        const totalLength = modelNameLength + relatedModelNameLength;
        const modelNameMaxLength = Math.floor(availableChars * (modelNameLength / totalLength));
        const relatedModelNameMaxLength = availableChars - modelNameMaxLength;
        const shortenedModelName = modelName.substring(0, Math.max(3, modelNameMaxLength));
        const shortenedRelatedModelName = relatedModelName.substring(0, Math.max(3, relatedModelNameMaxLength));
        // Create the new relation name
        return `${shortenedModelName}_${shortenedRelatedModelName}_${index}`.toLowerCase();
    }
    /**
     * Reset all relations (useful for testing)
     */
    static resetRelations() {
        this.allRelations.clear();
    }
    /**
     * Get all relations (useful for debugging)
     */
    static getAllRelations() {
        return this.allRelations;
    }
}
exports.RelationManager = RelationManager;
RelationManager.allRelations = new Map();
