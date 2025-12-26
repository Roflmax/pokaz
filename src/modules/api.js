/**
 * Mock API для демо-версии
 * Все данные загружаются локально, без backend
 */
import { DEMO_CASES, CASES_WITH_ANALYSIS } from '../data/cases.js';
import { DEMO_UPLOADS, UPLOADS_WITH_ANALYSIS } from '../data/uploads.js';
import { ANALYSES } from '../data/analyses.js';

export const API = {
    async getCases(courtType, limit = 30) {
        // Только арбитражные дела из базы
        if (courtType !== 'arbitration') {
            return { cases: [], total: 0, showing: 0 };
        }

        const cases = DEMO_CASES.slice(0, limit).map(c => ({
            case_number: c.case_number,
            doc_id: c.doc_id,
            court: c.court,
            date: c.date,
            has_analysis: c.has_analysis
        }));

        return {
            cases,
            total: DEMO_CASES.length,
            showing: cases.length
        };
    },

    async getCaseDetail(caseNumber) {
        const caseData = DEMO_CASES.find(c => c.case_number === caseNumber);
        if (!caseData) throw new Error('Case not found');

        // Загрузить HTML из public/cases/arbit/
        const response = await fetch(`/cases/arbit/${caseData.folder}.html`);
        if (!response.ok) throw new Error('Failed to load document');
        const htmlContent = await response.text();

        return {
            documents: [{
                html_content: htmlContent,
                doc_id: caseData.doc_id
            }]
        };
    },

    async getCacheStatus(caseNumber) {
        const caseData = DEMO_CASES.find(c => c.case_number === caseNumber);
        if (!caseData) return { analytic: false, detail: false };

        const hasAnalysis = CASES_WITH_ANALYSIS.includes(caseData.folder);
        return {
            analytic: hasAnalysis,
            detail: hasAnalysis
        };
    },

    // Uploads API
    async getUploads(courtType = null) {
        let docs = DEMO_UPLOADS;
        if (courtType) {
            docs = docs.filter(u => u.court_type === courtType);
        }
        return {
            documents: docs.map(u => ({
                folder: u.folder,
                title: u.title,
                court_type: u.court_type,
                created_at: u.created_at,
                has_analysis: u.has_analysis
            })),
            total: docs.length
        };
    },

    async getUploadDetail(folder) {
        const upload = DEMO_UPLOADS.find(u => u.folder === folder);
        if (!upload) throw new Error('Upload not found');

        // Загрузить контент из public/cases/uploads/
        const response = await fetch(`/cases/uploads/${folder}.html`);
        if (!response.ok) throw new Error('Failed to load document');
        const content = await response.text();

        return {
            content: content,
            title: upload.title,
            court_type: upload.court_type
        };
    },

    async getUploadCacheStatus(folder) {
        const hasAnalysis = UPLOADS_WITH_ANALYSIS.includes(folder);
        return {
            analytic: hasAnalysis,
            detail: hasAnalysis
        };
    },

    async saveUpload(courtType, title, text, file) {
        // Демо-режим - загрузка отключена
        return {
            success: false,
            error: 'Загрузка документов недоступна в демо-режиме'
        };
    },

    async deleteUpload(folder) {
        // Демо-режим - удаление отключено
        return false;
    },

    async extractData(courtType, mode, text, file, caseNumber, uploadFolder, forceRefresh) {
        // Определяем ключ для поиска анализа
        let analysisKey = null;
        let isArbitCase = false;

        if (caseNumber) {
            const caseData = DEMO_CASES.find(c => c.case_number === caseNumber);
            if (caseData) {
                analysisKey = caseData.folder;
                isArbitCase = true;
            }
        } else if (uploadFolder) {
            analysisKey = uploadFolder;
        }

        if (!analysisKey) {
            return {
                success: false,
                error: 'Анализ доступен только для предустановленных документов в демо-режиме'
            };
        }

        // Проверяем наличие анализа
        const analysis = ANALYSES[analysisKey];

        if (!analysis || !analysis[mode]) {
            // Формируем сообщение о доступных документах
            let availableMsg = '';
            if (isArbitCase) {
                availableMsg = 'Арбитражные дела с анализом:\\n• А40-146245/2012\\n• А40-147170/2022\\n• А40-16413/2022';
            } else {
                availableMsg = 'Загруженные документы с анализом доступны во вкладках:\\n• Гражданские\\n• Административные\\n• Уголовные';
            }

            return {
                success: false,
                error: `Анализ недоступен для этого документа в демо-режиме.\\n\\n${availableMsg}`
            };
        }

        // Возвращаем готовый анализ
        return {
            success: true,
            data: analysis[mode],
            cached: true,
            processing_time: 0,
            court_type: courtType,
            mode: mode
        };
    }
};
