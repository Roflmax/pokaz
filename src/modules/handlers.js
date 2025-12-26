/**
 * Обработчики событий (демо-версия)
 */
import { AppState } from './state.js';
import { API } from './api.js';
import { UI } from './ui.js';

export const Handlers = {
    async onCourtTypeChange(courtType) {
        AppState.currentCourtType = courtType;
        AppState.currentCaseNumber = null;
        AppState.currentUploadFolder = null;
        AppState.currentDocId = null;

        // Очистить панели
        document.getElementById('documentContent').innerHTML = `
            <div class="placeholder-text">
                <i class="fas fa-file-alt fa-3x mb-3"></i>
                <p>Выберите дело из списка слева для просмотра документа</p>
            </div>
        `;
        document.getElementById('analysisContent').innerHTML = `
            <div class="placeholder-text">
                <i class="fas fa-chart-bar fa-3x mb-3"></i>
                <p>Выберите дело и нажмите "Анализировать"</p>
            </div>
        `;
        document.getElementById('analyzeBtn').disabled = true;

        UI.showLoading('casesList');

        try {
            // Загрузить пользовательские документы для этого типа суда
            const uploadsResponse = await API.getUploads(courtType);
            AppState.uploads = uploadsResponse.documents || [];

            // Загрузить дела из базы (только для арбитражных)
            let cases = [];
            if (courtType === 'arbitration') {
                const response = await API.getCases(courtType, 30);
                cases = response.cases;
                AppState.cases = cases;
                document.getElementById('casesShowing').textContent = response.showing + AppState.uploads.length;
                document.getElementById('casesTotal').textContent = response.total + AppState.uploads.length;
            } else {
                AppState.cases = [];
                document.getElementById('casesShowing').textContent = AppState.uploads.length;
                document.getElementById('casesTotal').textContent = AppState.uploads.length;
            }

            UI.renderCasesList(cases, AppState.uploads);

        } catch (error) {
            UI.showError('Ошибка загрузки списка дел');
            console.error(error);
        } finally {
            UI.hideLoading('casesList');
        }
    },

    async onCaseSelect(event) {
        const caseItem = event.target.closest('.case-item');
        if (!caseItem) return;

        const caseNumber = caseItem.dataset.case;
        const uploadFolder = caseItem.dataset.upload;
        const courtType = caseItem.dataset.court || AppState.currentCourtType;

        // Сбрасываем состояние
        AppState.currentCaseNumber = caseNumber || null;
        AppState.currentUploadFolder = uploadFolder || null;
        AppState.currentDocId = caseItem.dataset.doc || null;

        if (uploadFolder && courtType) {
            AppState.currentCourtType = courtType;
        }

        // Выделить выбранное дело
        document.querySelectorAll('.case-item').forEach(el =>
            el.classList.remove('active')
        );
        caseItem.classList.add('active');

        // Проверить статус кеша
        let cacheStatus;
        const cacheKey = uploadFolder || caseNumber;

        if (uploadFolder) {
            cacheStatus = await API.getUploadCacheStatus(uploadFolder);
        } else {
            cacheStatus = await API.getCacheStatus(caseNumber);
        }
        AppState.serverCacheStatus[cacheKey] = cacheStatus;

        // Обновить кнопку анализа
        Handlers.updateAnalyzeButton();

        // Показать кешированные данные если есть
        const mode = AppState.currentMode;

        if (cacheStatus[mode]) {
            document.getElementById('analysisContent').innerHTML = `
                <div class="placeholder-text">
                    <i class="fas fa-database fa-3x mb-3 text-success"></i>
                    <p>Загрузка анализа...</p>
                </div>
            `;
            Handlers.onAnalyzeClick(false);
        } else {
            document.getElementById('analysisContent').innerHTML = `
                <div class="placeholder-text">
                    <i class="fas fa-chart-bar fa-3x mb-3"></i>
                    <p>Нажмите "Анализировать" для анализа документа</p>
                </div>
            `;
        }

        UI.showLoading('documentContent');

        try {
            if (uploadFolder) {
                const response = await API.getUploadDetail(uploadFolder);
                UI.renderDocument(response.content, response.title);
            } else {
                const response = await API.getCaseDetail(caseNumber);
                if (response.documents && response.documents.length > 0) {
                    const doc = response.documents[0];
                    UI.renderDocument(doc.html_content, caseNumber);
                } else {
                    throw new Error('No documents found');
                }
            }
        } catch (error) {
            UI.showError('Ошибка загрузки документа');
            console.error(error);
        } finally {
            UI.hideLoading('documentContent');
        }
    },

    updateAnalyzeButton() {
        const btn = document.getElementById('analyzeBtn');
        const currentKey = AppState.currentUploadFolder || AppState.currentCaseNumber;

        if (!currentKey) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-play"></i> Анализировать';
            return;
        }

        const cacheStatus = AppState.serverCacheStatus[currentKey] || {};
        const mode = AppState.currentMode;
        const hasCache = cacheStatus[mode];

        btn.disabled = false;
        if (hasCache) {
            btn.innerHTML = '<i class="fas fa-eye"></i> Показать анализ';
            btn.classList.add('btn-success');
            btn.classList.remove('btn-primary', 'btn-warning');
        } else {
            btn.innerHTML = '<i class="fas fa-lock"></i> Анализ недоступен';
            btn.classList.add('btn-warning');
            btn.classList.remove('btn-primary', 'btn-success');
        }
    },

    async onAnalyzeClick(forceRefresh = null) {
        if (forceRefresh && typeof forceRefresh === 'object') {
            forceRefresh = null;
        }

        const currentKey = AppState.currentUploadFolder || AppState.currentCaseNumber;

        if (!currentKey) {
            UI.showError('Выберите дело для анализа');
            return;
        }

        const mode = AppState.currentMode;
        const cacheKey = `${currentKey}_${mode}`;

        // Проверить локальный кеш
        if (AppState.cachedAnalysis[cacheKey]) {
            UI.renderAnalysis(AppState.cachedAnalysis[cacheKey], mode);
            Handlers.showCachedBadge(true);
            return;
        }

        UI.showLoading('analysisContent');

        try {
            const response = await API.extractData(
                AppState.currentCourtType,
                mode,
                null,
                null,
                AppState.currentCaseNumber,
                AppState.currentUploadFolder,
                forceRefresh
            );

            UI.hideLoading('analysisContent');

            if (response.success) {
                AppState.cachedAnalysis[cacheKey] = response.data;
                UI.renderAnalysis(response.data, mode);
                Handlers.showCachedBadge(true);
            } else {
                // Показать демо-сообщение
                UI.renderDemoNotice(response.error);
            }
        } catch (error) {
            UI.hideLoading('analysisContent');
            UI.showError('Ошибка анализа документа: ' + error.message);
            console.error(error);
        }
    },

    showCachedBadge(cached) {
        const oldBadge = document.querySelector('.cached-badge');
        if (oldBadge) oldBadge.remove();

        if (cached) {
            const badge = document.createElement('div');
            badge.className = 'cached-badge alert alert-success py-1 px-2 mb-2';
            badge.innerHTML = '<small><i class="fas fa-check-circle"></i> Демо-данные</small>';
            document.getElementById('analysisContent').prepend(badge);
        }
    },

    onModeChange(mode) {
        AppState.currentMode = mode;
        Handlers.updateAnalyzeButton();

        const currentKey = AppState.currentUploadFolder || AppState.currentCaseNumber;
        if (!currentKey) return;

        const cacheKey = `${currentKey}_${mode}`;
        if (AppState.cachedAnalysis[cacheKey]) {
            UI.renderAnalysis(AppState.cachedAnalysis[cacheKey], mode);
            Handlers.showCachedBadge(true);
        } else {
            const cacheStatus = AppState.serverCacheStatus[currentKey] || {};
            if (cacheStatus[mode]) {
                Handlers.onAnalyzeClick(false);
            } else {
                document.getElementById('analysisContent').innerHTML = `
                    <div class="placeholder-text">
                        <i class="fas fa-lock fa-3x mb-3 text-warning"></i>
                        <p>Анализ в режиме "${mode === 'analytic' ? 'Аналитический' : 'Детальный'}" недоступен для этого документа в демо</p>
                    </div>
                `;
            }
        }
    }
};
