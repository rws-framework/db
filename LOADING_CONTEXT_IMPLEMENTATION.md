# LoadingContext Implementation - Solution 1 Documentation

## Problem Statement

The RWS framework had a potential infinite recursion issue in the postLoad mechanism where:

1. **User model postLoad** calls `userGroup.reload(true)` 
2. **UserGroup model postLoad** calls `User.find(owner, { cancelPostLoad: true })`
3. If that User gets loaded elsewhere without `cancelPostLoad: true`, it could trigger an infinite cycle

The existing anti-recursion mechanism was **per-instance** rather than **per-loading-context**, meaning it only prevented the same object from running postLoad multiple times, but didn't prevent circular loading between different instances of related models.

## Solution: Context-Based Loading Stack

### Implementation Components

#### 1. LoadingContext Class (`/models/utils/LoadingContext.ts`)

A utility class that tracks the chain of models currently being loaded to prevent circular references:

**Key Features:**
- **Static loading stack**: Tracks `ModelType:ID` combinations currently being loaded
- **Circular reference detection**: Prevents loading a model that's already in the loading chain
- **Maximum depth protection**: Prevents infinite chains with configurable depth limit
- **Automatic cleanup**: Uses try/finally blocks to ensure proper cleanup
- **Debugging support**: Provides stack inspection and clear error messages

**Key Methods:**
- `isLoading(modelType, id)`: Check if a model is currently being loaded
- `startLoading(modelType, id)`: Mark a model as being loaded
- `finishLoading(modelType, id)`: Mark a model as finished loading
- `withLoadingContext(modelType, id, fn)`: Execute function with automatic context management

#### 2. FindUtils Integration (`/models/utils/FindUtils.ts`)

Modified all find methods to use LoadingContext:

**Changes in `find()`, `findOneBy()`, `findBy()`, and `paginate()`:**
- Check if model is already being loaded before creating instance
- Use `LoadingContext.withLoadingContext()` to wrap model loading
- Return `null` or skip items that are already being loaded
- Provide warning messages for detected circular references

#### 3. RWSModel Integration (`/models/core/RWSModel.ts`)

- Added LoadingContext import
- The reload method now uses FindUtils which automatically gets the protection

### How It Works

#### Normal Loading Flow
```
1. User.find(1) -> LoadingContext.startLoading('User', 1)
2. User._asyncFill() -> loads userGroup relation
3. UserGroup.reload() -> LoadingContext.startLoading('UserGroup', 2)  
4. UserGroup._asyncFill() -> loads owner relation
5. User.find(owner) -> LoadingContext.startLoading('User', 3)
6. Complete normally -> LoadingContext.finishLoading() for each
```

#### Circular Reference Prevention
```
1. User.find(1) -> LoadingContext.startLoading('User', 1)
2. User._asyncFill() -> loads userGroup relation
3. UserGroup.reload() -> LoadingContext.startLoading('UserGroup', 2)  
4. UserGroup._asyncFill() -> tries to load User.find(1) again
5. LoadingContext.isLoading('User', 1) returns true
6. Returns null instead of creating infinite loop
7. Warning logged: "Circular reference detected"
```

#### Maximum Depth Protection
```
If loading chain exceeds configurable limit (default 10):
- Throws descriptive error with full loading stack
- Shows exact chain: "Model1:1 -> Model2:2 -> Model3:3 -> ..."
- Helps identify complex circular dependencies
```

### Benefits

1. **Complete Circular Reference Prevention**: Unlike the previous per-instance flag, this prevents all types of circular loading
2. **Transparent Integration**: Existing code doesn't need changes - works automatically through FindUtils
3. **Performance Optimized**: Minimal overhead - just Set operations for tracking
4. **Debugging Friendly**: Clear error messages and stack inspection capabilities
5. **Configurable**: Adjustable maximum depth and behavior
6. **Fail-Safe**: Always cleans up loading stack even if errors occur

### Configuration Options

```typescript
// Set maximum loading depth (default: 10)
LoadingContext.setMaxDepth(15);

// Get current loading stack for debugging
console.log(LoadingContext.getLoadingStack());

// Clear stack in emergency situations
LoadingContext.clearStack();
```

### Backward Compatibility

- **100% backward compatible**: No changes needed to existing model code
- **Existing `cancelPostLoad` still works**: Provides additional layer of protection
- **All existing APIs preserved**: No breaking changes to FindUtils or RWSModel

### Testing

A test file (`LoadingContext.test.ts`) demonstrates:
- Basic loading detection
- Circular reference prevention  
- Maximum depth protection
- Automatic cleanup

### Error Handling

The implementation provides clear error messages:
- **Circular Reference**: "Circular reference detected: User:1 is already being loaded. Breaking cycle."
- **Maximum Depth**: "Maximum loading depth (10) exceeded. Possible circular reference detected. Loading stack: User:1 -> UserGroup:2 -> ..."

This solution provides robust protection against infinite recursion while maintaining full backward compatibility and excellent debugging capabilities.