/**
 * Глобальное состояние приложения (демо-версия)
 */
export const AppState = {
    currentCourtType: 'arbitration',
    currentCaseNumber: null,
    currentUploadFolder: null,
    currentDocId: null,
    currentMode: 'analytic',
    cases: [],
    uploads: [],
    extractedData: null,
    cachedAnalysis: {},
    serverCacheStatus: {}
};

// Экспорт для demos.js
window.AppState = AppState;
