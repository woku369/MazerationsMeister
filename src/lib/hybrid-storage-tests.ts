/**
 * Test-Skript für Hybrid Storage System
 * 
 * Dieses Skript testet die grundlegenden Funktionen des Hybrid Storage Systems
 * sowohl in Browser- als auch in Electron-Umgebung.
 */

import { hybridStorage, getHybridStorage } from '../lib/hybrid-storage';

// Test-Daten
const testData = {
  'test-string': 'Hello World!',
  'test-number': 42,
  'test-object': { name: 'Test', value: 123, nested: { data: true } },
  'test-array': [1, 2, 3, 'four', { five: 5 }],
  'test-boolean': true,
  'test-null': null,
  'github-token': 'ghp_test_token_for_testing_purposes_only',
};

/**
 * Führt alle Basis-Tests aus
 */
export async function runBasicTests(): Promise<boolean> {
  console.log('🧪 Starte Hybrid Storage Basic Tests...');
  
  try {
    // 1. Environment Test
    const storage = getHybridStorage({ debugLogging: true });
    const stats = storage.getStats();
    
    console.log('📊 Storage Environment:', stats.environment);
    console.log('⚡ Electron verfügbar:', stats.isElectronAvailable);
    console.log('🌐 Browser Storage verfügbar:', stats.isBrowserStorageAvailable);
    
    // 2. Set/Get Tests
    console.log('\n📝 Testing Set/Get Operations...');
    
    for (const [key, value] of Object.entries(testData)) {
      await hybridStorage.set(key, value);
      const retrieved = await hybridStorage.get(key);
      
      const isEqual = JSON.stringify(value) === JSON.stringify(retrieved);
      
      console.log(`  ${isEqual ? '✅' : '❌'} ${key}: ${isEqual ? 'OK' : 'FAILED'}`);
      
      if (!isEqual) {
        console.log(`    Expected: ${JSON.stringify(value)}`);
        console.log(`    Got:      ${JSON.stringify(retrieved)}`);
        return false;
      }
    }
    
    // 3. Keys Test
    console.log('\n🔑 Testing Keys Operation...');
    const keys = await hybridStorage.keys();
    const expectedKeys = Object.keys(testData);
    
    console.log(`  Keys found: ${keys.length}`);
    console.log(`  Expected: ${expectedKeys.length}`);
    
    const allKeysFound = expectedKeys.every(key => keys.includes(key));
    console.log(`  ${allKeysFound ? '✅' : '❌'} All keys present: ${allKeysFound}`);
    
    if (!allKeysFound) {
      console.log(`    Missing keys: ${expectedKeys.filter(key => !keys.includes(key))}`);
      return false;
    }
    
    // 4. Remove Test
    console.log('\n🗑️  Testing Remove Operation...');
    const removeTestKey = 'test-string';
    const removed = await hybridStorage.remove(removeTestKey);
    const afterRemove = await hybridStorage.get(removeTestKey);
    
    console.log(`  ${removed ? '✅' : '❌'} Remove returned: ${removed}`);
    console.log(`  ${afterRemove === null ? '✅' : '❌'} Value after remove: ${afterRemove}`);
    
    if (!removed || afterRemove !== null) {
      return false;
    }
    
    // 5. Performance Test
    console.log('\n⚡ Testing Performance...');
    
    const performanceStart = performance.now();
    
    // 100 Set/Get Operations
    for (let i = 0; i < 100; i++) {
      await hybridStorage.set(`perf-test-${i}`, { iteration: i, timestamp: Date.now() });
      await hybridStorage.get(`perf-test-${i}`);
    }
    
    const performanceEnd = performance.now();
    const duration = performanceEnd - performanceStart;
    
    console.log(`  ⏱️  100 Set/Get operations: ${duration.toFixed(2)}ms`);
    console.log(`  📈 Average per operation: ${(duration / 200).toFixed(2)}ms`);
    
    // Cleanup Performance Test Data
    for (let i = 0; i < 100; i++) {
      await hybridStorage.remove(`perf-test-${i}`);
    }
    
    // 6. Export/Import Test
    console.log('\n📤 Testing Export/Import...');
    
    const exportedData = await hybridStorage.export();
    console.log(`  📦 Exported ${Object.keys(exportedData).length} items`);
    
    await hybridStorage.clear();
    const afterClear = await hybridStorage.keys();
    console.log(`  🧹 After clear: ${afterClear.length} items`);
    
    await hybridStorage.import(exportedData);
    const afterImport = await hybridStorage.keys();
    console.log(`  📥 After import: ${afterImport.length} items`);
    
    const importSuccess = afterImport.length === Object.keys(exportedData).length;
    console.log(`  ${importSuccess ? '✅' : '❌'} Import success: ${importSuccess}`);
    
    if (!importSuccess) {
      return false;
    }
    
    console.log('\n🎉 Alle Basic Tests erfolgreich!');
    return true;
    
  } catch (error) {
    console.error('❌ Test fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Führt Diagnose-Tests aus
 */
export async function runDiagnosticTests(): Promise<void> {
  console.log('\n🔍 Starte Diagnostic Tests...');
  
  try {
    const diagnostics = await hybridStorage.diagnose();
    
    console.log('📊 Diagnostic Results:');
    console.log('  Environment:', diagnostics.environment);
    console.log('  Electron Available:', diagnostics.electronAvailable);
    console.log('  Electron Ready:', diagnostics.electronReady);
    console.log('  Browser Storage Available:', diagnostics.browserStorageAvailable);
    console.log('  Key Count:', diagnostics.keyCount);
    console.log('  Sample Test Success:', diagnostics.sampleData.success);
    console.log('  Errors:', diagnostics.errors.length);
    
    if (diagnostics.performance) {
      console.log('  Performance:');
      console.log(`    Average Read Time: ${diagnostics.performance.averageReadTime.toFixed(2)}ms`);
      console.log(`    Average Write Time: ${diagnostics.performance.averageWriteTime.toFixed(2)}ms`);
      console.log(`    Total Operations: ${diagnostics.performance.totalOperations}`);
    }
    
    if (diagnostics.errors.length > 0) {
      console.log('⚠️  Errors:');
      diagnostics.errors.forEach(error => console.log(`    - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Diagnostic Test fehlgeschlagen:', error);
  }
}

/**
 * Event-System Test
 */
export async function runEventTests(): Promise<boolean> {
  console.log('\n🎭 Starte Event Tests...');
  
  return new Promise((resolve) => {
    let eventReceived = false;
    
    // Event Listener registrieren
    const listener = (event: any) => {
      console.log(`  📡 Event empfangen: ${event.key} = ${JSON.stringify(event.newValue)}`);
      eventReceived = true;
      
      if (event.key === 'event-test' && event.newValue === 'test-value') {
        console.log('  ✅ Event Test erfolgreich!');
        resolve(true);
      } else {
        console.log('  ❌ Event Test fehlgeschlagen - unerwartete Daten');
        resolve(false);
      }
    };
    
    hybridStorage.addEventListener(listener);
    
    // Event auslösen
    setTimeout(async () => {
      await hybridStorage.set('event-test', 'test-value');
      
      // Timeout für Event
      setTimeout(() => {
        if (!eventReceived) {
          console.log('  ❌ Event Test fehlgeschlagen - kein Event empfangen');
          resolve(false);
        }
        
        hybridStorage.removeEventListener(listener);
      }, 1000);
      
    }, 100);
  });
}

/**
 * GitHub Token Persistence Test (Hauptzweck des Systems)
 */
export async function runTokenPersistenceTest(): Promise<boolean> {
  console.log('\n🔑 Starte GitHub Token Persistence Test...');
  
  try {
    const testToken = 'ghp_test_1234567890abcdef_this_is_a_test_token';
    
    // Token speichern
    await hybridStorage.set('github-token', testToken);
    console.log('  💾 Token gespeichert');
    
    // Token wieder laden
    const retrievedToken = await hybridStorage.get('github-token');
    console.log('  📖 Token geladen:', retrievedToken?.substring(0, 20) + '...');
    
    const tokenMatch = testToken === retrievedToken;
    console.log(`  ${tokenMatch ? '✅' : '❌'} Token Match: ${tokenMatch}`);
    
    if (!tokenMatch) {
      console.log(`    Expected: ${testToken}`);
      console.log(`    Got:      ${retrievedToken}`);
      return false;
    }
    
    // Token aus verschiedenen Bereichen testen
    const keys = await hybridStorage.keys();
    const tokenExists = keys.includes('github-token');
    console.log(`  ${tokenExists ? '✅' : '❌'} Token in Key List: ${tokenExists}`);
    
    console.log('  🎉 GitHub Token Persistence Test erfolgreich!');
    return true;
    
  } catch (error) {
    console.error('  ❌ Token Persistence Test fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Haupttest-Funktion
 */
export async function runAllTests(): Promise<boolean> {
  console.log('🚀 Starte Hybrid Storage Test Suite...');
  console.log('=' .repeat(60));
  
  const results = {
    basic: await runBasicTests(),
    events: await runEventTests(),
    tokenPersistence: await runTokenPersistenceTest(),
  };
  
  await runDiagnosticTests();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`  Basic Tests: ${results.basic ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Event Tests: ${results.events ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Token Persistence: ${results.tokenPersistence ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall Result: ${allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Auto-run wenn direkt ausgeführt
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('load', () => {
    console.log('🌐 Browser environment detected - running tests...');
    runAllTests();
  });
} else if (typeof process !== 'undefined') {
  // Node.js environment
  console.log('⚙️ Node.js environment detected - running tests...');
  runAllTests();
}