"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLoadingContext = testLoadingContext;
const LoadingContext_1 = require("./LoadingContext");
/**
 * Simple test to verify LoadingContext functionality
 */
async function testLoadingContext() {
    console.log('Testing LoadingContext...');
    // Test 1: Basic loading detection
    console.log('Test 1: Basic loading detection');
    console.log('Is User:1 loading?', LoadingContext_1.LoadingContext.isLoading('User', 1)); // Should be false
    LoadingContext_1.LoadingContext.startLoading('User', 1);
    console.log('Is User:1 loading?', LoadingContext_1.LoadingContext.isLoading('User', 1)); // Should be true
    LoadingContext_1.LoadingContext.finishLoading('User', 1);
    console.log('Is User:1 loading?', LoadingContext_1.LoadingContext.isLoading('User', 1)); // Should be false
    // Test 2: Circular reference detection
    console.log('\nTest 2: Circular reference detection');
    try {
        await LoadingContext_1.LoadingContext.withLoadingContext('User', 1, async () => {
            console.log('Loading User:1...');
            // Simulate trying to load the same model again (circular reference)
            const result = await LoadingContext_1.LoadingContext.withLoadingContext('User', 1, async () => {
                console.log('This should not execute - circular reference detected');
                return 'should not reach here';
            });
            console.log('Circular reference result:', result); // Should be null
            return 'User loaded successfully';
        });
    }
    catch (error) {
        console.error('Error in circular reference test:', error);
    }
    // Test 3: Maximum depth protection
    console.log('\nTest 3: Maximum depth protection');
    LoadingContext_1.LoadingContext.setMaxDepth(3);
    try {
        LoadingContext_1.LoadingContext.startLoading('Model1', 1);
        LoadingContext_1.LoadingContext.startLoading('Model2', 2);
        LoadingContext_1.LoadingContext.startLoading('Model3', 3);
        // This should throw an error
        LoadingContext_1.LoadingContext.startLoading('Model4', 4);
    }
    catch (error) {
        console.log('Expected error caught:', error.message);
    }
    finally {
        LoadingContext_1.LoadingContext.clearStack();
    }
    console.log('LoadingContext tests completed!');
}
