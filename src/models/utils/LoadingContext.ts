/**
 * LoadingContext - Prevents circular references during model loading by tracking
 * the chain of models currently being loaded per execution context
 */

// Extend the global object type to include our execution context
declare global {
    var __currentExecutionContext: object | undefined;
}

export class LoadingContext {
    private static executionContexts = new WeakMap<object, Set<string>>();
    private static defaultMaxDepth: number = 10;

    /**
     * Get or create execution context identifier
     */
    private static getExecutionContext(): object {
        // Use a simple object as execution context identifier
        // In a real-world scenario, this could be tied to request context
        if (!globalThis.__currentExecutionContext) {
            globalThis.__currentExecutionContext = {};
        }
        return globalThis.__currentExecutionContext;
    }

    /**
     * Create a new execution context for an operation
     */
    static withNewExecutionContext<T>(fn: () => Promise<T>): Promise<T> {
        const previousContext = globalThis.__currentExecutionContext;
        
        try {
            globalThis.__currentExecutionContext = {};
            return fn();
        } finally {
            globalThis.__currentExecutionContext = previousContext;
        }
    }

    /**
     * Get the loading stack for current execution context
     */
    private static getLoadingStackInternal(): Set<string> {
        const context = this.getExecutionContext();
        if (!this.executionContexts.has(context)) {
            this.executionContexts.set(context, new Set<string>());
        }
        return this.executionContexts.get(context)!;
    }

    /**
     * Check if a model with specific ID is currently being loaded
     */
    static isLoading(modelType: string, id: string | number): boolean {
        const key = this.createKey(modelType, id);
        const loadingStack = this.getLoadingStackInternal();
        return loadingStack.has(key);
    }

    /**
     * Mark a model as currently being loaded
     */
    static startLoading(modelType: string, id: string | number): void {
        const key = this.createKey(modelType, id);
        const loadingStack = this.getLoadingStackInternal();
        
        // Check for maximum depth to prevent infinite chains
        if (loadingStack.size >= this.defaultMaxDepth) {
            const stackArray = Array.from(loadingStack);
            throw new Error(
                `Maximum loading depth (${this.defaultMaxDepth}) exceeded. ` +
                `Possible circular reference detected. Loading stack: ${stackArray.join(' -> ')} -> ${key}`
            );
        }
        
        loadingStack.add(key);
    }

    /**
     * Mark a model as finished loading
     */
    static finishLoading(modelType: string, id: string | number): void {
        const key = this.createKey(modelType, id);
        const loadingStack = this.getLoadingStackInternal();
        loadingStack.delete(key);
    }

    /**
     * Get current loading stack for debugging
     */
    static getLoadingStack(): string[] {
        const loadingStack = this.getLoadingStackInternal();
        return Array.from(loadingStack);
    }

    /**
     * Clear the entire loading stack for current context
     */
    static clearStack(): void {
        const loadingStack = this.getLoadingStackInternal();
        loadingStack.clear();
    }

    /**
     * Set default maximum loading depth
     */
    static setDefaultMaxDepth(depth: number): void {
        this.defaultMaxDepth = depth;
    }

    /**
     * Create a unique key for model type and ID
     */
    private static createKey(modelType: string, id: string | number): string {
        return `${modelType}:${id}`;
    }

    /**
     * Execute a function with loading context protection
     * Automatically manages start/finish loading calls
     */
    static async withLoadingContext<T>(
        modelType: string, 
        id: string | number, 
        fn: () => Promise<T>
    ): Promise<T> {
        if (this.isLoading(modelType, id)) {
            // If already loading, return null to break the cycle
            return null as T;
        }

        this.startLoading(modelType, id);
        try {
            return await fn();
        } finally {
            this.finishLoading(modelType, id);
        }
    }
}