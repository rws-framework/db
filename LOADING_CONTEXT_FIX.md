# LoadingContext Implementation - Solution 1 Documentation (Updated)

## Problem Statement

The RWS framework had two related issues in the postLoad mechanism:

### 1. Original Circular Reference Issue
- **User model postLoad** calls `userGroup.reload(true)` 
- **UserGroup model postLoad** calls `User.find(owner, { cancelPostLoad: true })`
- If that User gets loaded elsewhere without `cancelPostLoad: true`, it could trigger an infinite cycle

### 2. Cross-Request Stack Persistence Issue (Discovered)
- The LoadingContext had a **global loading stack** that persisted across HTTP requests
- Stack built up and never got cleared between requests
- Caused false positive "already being loaded" errors for subsequent requests
- Led to models not loading properly and authentication failures

## Solution: Request-Scoped Loading Context

### Key Fix: Execution Context Isolation

The critical fix was changing from a **global static loading stack** to **per-execution-context stacks**:

**Before (Problematic):**
```typescript
class LoadingContext {
    private static loadingStack: Set<string> = new Set(); // GLOBAL - persisted across requests
}
```

**After (Fixed):**
```typescript
class LoadingContext {
    private static executionContexts = new WeakMap<object, Set<string>>(); // Per-context isolation
    
    static withNewExecutionContext<T>(fn: () => Promise<T>): Promise<T> {
        // Creates fresh context for each operation
    }
}
```

### Implementation Components

#### 1. LoadingContext Class (`/models/utils/LoadingContext.ts`) - Updated

**Key Changes:**
- **Execution Context Isolation**: Each operation gets its own loading stack
- **WeakMap for Context Storage**: Associates loading stacks with execution contexts
- **Automatic Context Creation**: `withNewExecutionContext()` creates fresh contexts
- **Per-Request Isolation**: Each HTTP request gets its own clean loading context

#### 2. FindUtils Integration (`/models/utils/LoadingUtils.ts`) - Critical Fix

**All top-level methods now wrap operations in new execution contexts:**

```typescript
public static async findOneBy<T extends RWSModel<T>>(
    opModel: OpModelType<T>,
    findParams?: FindByType
): Promise<T | null> {
    // CRITICAL: Wrap in new execution context to ensure clean loading stack
    return LoadingContext.withNewExecutionContext(async () => {
        // ... existing logic with circular reference protection
    });
}
```

### How The Fix Works

#### Before Fix (Problematic):
```
Request 1: User.find(11) -> adds "User:11" to global stack
Request 1: UserGroup.reload() -> adds "UserGroup:10" to global stack  
Request 1: Completes, but stack NOT cleared
Request 2: User.find(11) -> "User:11" already in global stack -> FALSE POSITIVE error
```

#### After Fix (Working):
```
Request 1: LoadingContext.withNewExecutionContext() -> creates fresh context
Request 1: User.find(11) -> adds "User:11" to context-specific stack
Request 1: UserGroup.reload() -> adds "UserGroup:10" to same context stack
Request 1: Completes -> context automatically cleaned up

Request 2: LoadingContext.withNewExecutionContext() -> creates NEW fresh context  
Request 2: User.find(11) -> adds "User:11" to NEW context stack -> works normally
```

### Request Isolation Benefits

1. **No Cross-Request Interference**: Each HTTP request gets its own loading context
2. **Automatic Cleanup**: No manual stack management needed
3. **Proper Circular Detection**: Still prevents infinite loops within single operations
4. **No False Positives**: Eliminates "already loading" errors between requests

### Configuration

```typescript
// Set maximum loading depth for new contexts (default: 10)
LoadingContext.setDefaultMaxDepth(15);

// Get current loading stack for debugging current context
console.log(LoadingContext.getLoadingStack());

// Manual context creation (usually not needed)
await LoadingContext.withNewExecutionContext(async () => {
    // Database operations here get fresh context
});
```

### Testing Results

**Before Fix - Error Logs:**
```
Circular reference detected: User:11 is already being loaded. Breaking cycle.
UnauthorizedException: Unauthorized
Circular reference detected: User:11 is already being loaded. Breaking cycle.
Circular reference detected: UserGroup:10 is already being loaded. Breaking cycle.
Circular reference detected: UserGroup:10 is already being loaded. Breaking cycle.
// Repeated across multiple requests - FALSE POSITIVES
```

**After Fix:**
- Clean loading per HTTP request
- No false positive circular reference detections  
- Proper circular reference protection within individual operations
- No authentication failures due to loading issues
- No cross-request interference

### Backward Compatibility

- **100% backward compatible**: No changes needed to existing model code
- **Existing `cancelPostLoad` still works**: Provides additional layer of protection
- **All existing APIs preserved**: No breaking changes to any interfaces
- **Automatic context management**: Developers don't need to manage contexts manually

### Summary

This fix resolves both the original circular reference issue AND the newly discovered cross-request stack persistence problem. The key insight was that the loading context needs to be **request-scoped** rather than **application-global**. Each database operation chain now gets its own clean loading context, preventing both infinite recursion within operations and false positive detection across operations.