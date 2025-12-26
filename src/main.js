/**
 * Демо-версия приложения для анализа судебных решений
 * Точка входа
 */

import { AppState } from './modules/state.js';
import { API } from './modules/api.js';
import { UI } from './modules/ui.js';
import { Handlers } from './modules/handlers.js';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Court Analysis Demo initialized');

    // Загрузить арбитражные дела и загруженные документы
    try {
        const [casesResponse, uploadsResponse] = await Promise.all([
            API.getCases('arbitration', 30),
            API.getUploads('arbitration')
        ]);

        AppState.cases = casesResponse.cases;
        AppState.uploads = uploadsResponse.documents || [];
        UI.renderCasesList(casesResponse.cases, AppState.uploads);

        const totalItems = casesResponse.total + AppState.uploads.length;
        const showingItems = casesResponse.showing + AppState.uploads.length;
        document.getElementById('casesShowing').textContent = showingItems;
        document.getElementById('casesTotal').textContent = totalItems;
    } catch (error) {
        console.error('Error loading initial cases:', error);
        UI.showError('Ошибка загрузки дел');
    }

    // Установить обработчики событий

    // Табы типов судов
    document.getElementById('courtTypeTabs').addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (link) {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(el =>
                el.classList.remove('active')
            );
            link.classList.add('active');
            Handlers.onCourtTypeChange(link.dataset.court);
        }
    });

    // Список дел
    document.getElementById('casesList').addEventListener('click', Handlers.onCaseSelect);

    // Кнопка анализа
    document.getElementById('analyzeBtn').addEventListener('click', Handlers.onAnalyzeClick);

    // Переключатель режимов
    document.querySelectorAll('[name="extractionMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => Handlers.onModeChange(e.target.value));
    });

    // Демо-кнопки (граф)
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const demoType = e.currentTarget.dataset.demo;
            if (demoType === 'graph' && window.CaseGraph) {
                const container = document.getElementById('analysisContent');
                window.CaseGraph.render(container);
            }
        });
    });

    console.log('Event handlers initialized');
});
