/**
 * LoadingContext - Prevents circular references during model loading by tracking
 * the chain of models currently being loaded per execution context
 */
declare global {
    var __currentExecutionContext: object | undefined;
}
export declare class LoadingContext {
    private static executionContexts;
    private static defaultMaxDepth;
    /**
     * Get or create execution context identifier
     */
    private static getExecutionContext;
    /**
     * Create a new execution context for an operation
     */
    static withNewExecutionContext<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Get the loading stack for current execution context
     */
    private static getLoadingStackInternal;
    /**
     * Check if a model with specific ID is currently being loaded
     */
    static isLoading(modelType: string, id: string | number): boolean;
    /**
     * Mark a model as currently being loaded
     */
    static startLoading(modelType: string, id: string | number): void;
    /**
     * Mark a model as finished loading
     */
    static finishLoading(modelType: string, id: string | number): void;
    /**
     * Get current loading stack for debugging
     */
    static getLoadingStack(): string[];
    /**
     * Clear the entire loading stack for current context
     */
    static clearStack(): void;
    /**
     * Set default maximum loading depth
     */
    static setDefaultMaxDepth(depth: number): void;
    /**
     * Create a unique key for model type and ID
     */
    private static createKey;
    /**
     * Execute a function with loading context protection
     * Automatically manages start/finish loading calls
     */
    static withLoadingContext<T>(modelType: string, id: string | number, fn: () => Promise<T>): Promise<T>;
}
