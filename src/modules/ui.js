/**
 * UI модуль для рендеринга интерфейса
 */

export const UI = {
    renderCasesList(cases, uploads = []) {
        const container = document.getElementById('casesList');

        if (cases.length === 0 && uploads.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>Нет доступных дел</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Загруженные документы
        if (uploads.length > 0) {
            html += `<div class="uploads-section mb-3">
                <div class="section-header text-muted small mb-2">
                    <i class="fas fa-upload"></i> Демо-документы (${uploads.length})
                </div>
                ${uploads.map(u => `
                    <div class="case-item upload-item ${u.has_analysis ? 'has-analysis' : ''}"
                         data-upload="${u.folder}" data-court="${u.court_type}">
                        <div class="case-number">
                            <i class="fas fa-file-alt text-success"></i> ${u.title}
                            ${u.has_analysis ? '<span class="badge bg-success ms-1" style="font-size: 9px;">анализ</span>' : ''}
                        </div>
                        <div class="case-court">${this._getCourtLabel(u.court_type)}</div>
                        <div class="case-date">
                            <small><i class="fas fa-calendar"></i> ${new Date(u.created_at).toLocaleDateString('ru-RU')}</small>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        }

        // Дела из базы
        if (cases.length > 0) {
            html += `<div class="cases-section">
                <div class="section-header text-muted small mb-2">
                    <i class="fas fa-database"></i> База дел (${cases.length})
                </div>
                ${cases.map(c => `
                    <div class="case-item ${c.has_analysis ? 'has-analysis' : ''}"
                         data-case="${c.case_number}" data-doc="${c.doc_id}">
                        <div class="case-number">
                            ${c.case_number}
                            ${c.has_analysis ? '<span class="badge bg-success ms-1" style="font-size: 9px;">анализ</span>' : ''}
                        </div>
                        <div class="case-court">${c.court}</div>
                        <div class="case-date"><small><i class="fas fa-calendar"></i> ${c.date}</small></div>
                    </div>
                `).join('')}
            </div>`;
        }

        container.innerHTML = html;
    },

    _getCourtLabel(courtType) {
        const labels = {
            'arbitration': 'Арбитражный',
            'civil': 'Гражданский',
            'administrative': 'Административный',
            'criminal': 'Уголовный'
        };
        return labels[courtType] || courtType;
    },

    renderDocument(htmlContent, title) {
        document.getElementById('documentTitle').textContent = title;
        document.getElementById('documentContent').innerHTML = htmlContent;
        document.getElementById('analyzeBtn').disabled = false;
    },

    renderAnalysis(data, mode) {
        const container = document.getElementById('analysisContent');

        if (!data) {
            container.innerHTML = `
                <div class="placeholder-text">
                    <i class="fas fa-chart-bar fa-3x mb-3"></i>
                    <p>Нет данных для отображения</p>
                </div>
            `;
            return;
        }

        if (mode === 'analytic') {
            container.innerHTML = this._renderAnalyticView(data);
        } else {
            container.innerHTML = this._renderDetailView(data);
        }
    },

    renderDemoNotice(message) {
        const container = document.getElementById('analysisContent');
        container.innerHTML = `
            <div class="demo-notice">
                <i class="fas fa-lock fa-3x mb-3"></i>
                <h5>Демо-режим</h5>
                <p style="white-space: pre-line;">${message}</p>
                <hr>
                <p class="small text-muted mb-0">Выберите документ с готовым анализом (отмечен зелёным бейджем)</p>
            </div>
        `;
    },

    _renderAnalyticView(data) {
        const intro = data.карточка_дела || data.вводная_часть || {};
        const parties = data.стороны || {};
        const dispute = data.суть_спора || {};
        const conclusion = data.выводы_суда || {};
        const result = data.результат || {};

        const plaintiffName = parties.истец?.наименование || parties.истец || 'N/A';
        const defendantName = parties.ответчик?.наименование || parties.ответчик || 'N/A';

        const disputeText = typeof dispute === 'string'
            ? dispute
            : (dispute.краткое_описание || dispute.предмет_иска || 'Не указано');

        let conclusionHtml = '';
        if (conclusion && typeof conclusion === 'object') {
            if (conclusion.правовая_квалификация) {
                conclusionHtml += `<p><strong>Правовая квалификация:</strong> ${conclusion.правовая_квалификация}</p>`;
            }
            if (conclusion.установленные_факты && Array.isArray(conclusion.установленные_факты)) {
                conclusionHtml += `<p><strong>Установленные факты:</strong></p><ul class="small">`;
                conclusion.установленные_факты.forEach(fact => {
                    conclusionHtml += `<li>${fact}</li>`;
                });
                conclusionHtml += `</ul>`;
            }
        } else if (typeof conclusion === 'string') {
            conclusionHtml = `<p>${conclusion}</p>`;
        }

        let resultText = '';
        let isRejected = false;
        if (result && typeof result === 'object') {
            const outcome = result.исход || result.решение || 'Не указано';
            isRejected = outcome.toLowerCase().includes('отказ');
            resultText = `<p><strong>Исход:</strong> <span class="badge ${isRejected ? 'bg-danger' : 'bg-success'}">${outcome}</span></p>`;

            if (result.взыскано) {
                const amount = result.взыскано.итого || result.взыскано.основной_долг || 0;
                if (amount > 0) {
                    resultText += `<p><strong>Взыскано:</strong> ${amount.toLocaleString('ru-RU')} руб.</p>`;
                }
            }
            if (result.иные_последствия) {
                resultText += `<p class="small mb-0">${result.иные_последствия}</p>`;
            }
        } else if (typeof result === 'string') {
            resultText = `<p>${result}</p>`;
            isRejected = result.toLowerCase().includes('отказ');
        } else {
            resultText = '<p>Не указано</p>';
        }

        return `
            <div class="analysis-card">
                <div class="card mb-3">
                    <div class="card-header">
                        <i class="fas fa-gavel"></i> Карточка дела
                    </div>
                    <div class="card-body">
                        <p><strong>Номер:</strong> ${intro.номер || intro.номер_дела || 'N/A'}</p>
                        <p><strong>Дата:</strong> ${intro.дата_решения || intro.дата || 'N/A'}</p>
                        <p><strong>Суд:</strong> ${intro.суд || intro.наименование_суда || 'N/A'}</p>
                        ${intro.категория || intro.категория_дела ? `<p><span class="badge bg-primary">${intro.категория || intro.категория_дела}</span></p>` : ''}
                    </div>
                </div>

                <div class="card mb-3">
                    <div class="card-header">
                        <i class="fas fa-users"></i> Стороны
                    </div>
                    <div class="card-body">
                        <p><strong>Истец:</strong> ${plaintiffName}</p>
                        <p><strong>Ответчик:</strong> ${defendantName}</p>
                    </div>
                </div>

                <div class="card mb-3">
                    <div class="card-header">
                        <i class="fas fa-info-circle"></i> Суть спора
                    </div>
                    <div class="card-body">
                        <p>${disputeText}</p>
                    </div>
                </div>

                ${conclusionHtml ? `
                <div class="card mb-3">
                    <div class="card-header">
                        <i class="fas fa-balance-scale"></i> Выводы суда
                    </div>
                    <div class="card-body">
                        ${conclusionHtml}
                    </div>
                </div>
                ` : ''}

                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <i class="fas fa-check-circle"></i> Результат
                    </div>
                    <div class="card-body">
                        ${resultText}
                    </div>
                </div>
            </div>
        `;
    },

    _renderDetailView(data) {
        const sections = [];
        let sectionIndex = 0;

        for (const [key, value] of Object.entries(data)) {
            sectionIndex++;
            const content = this._renderDetailSection(value);

            sections.push(`
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button ${sectionIndex === 1 ? '' : 'collapsed'}"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#section${sectionIndex}">
                            ${this._formatKey(key)}
                        </button>
                    </h2>
                    <div id="section${sectionIndex}"
                         class="accordion-collapse collapse ${sectionIndex === 1 ? 'show' : ''}"
                         data-bs-parent="#detailAccordion">
                        <div class="accordion-body">
                            ${content}
                        </div>
                    </div>
                </div>
            `);
        }

        return `<div class="accordion" id="detailAccordion">${sections.join('')}</div>`;
    },

    _renderDetailSection(value) {
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                if (value.length === 0) return '<em class="text-muted">Пустой список</em>';
                if (value.every(item => typeof item !== 'object')) {
                    return `<ul class="detail-list">${value.map(item => `<li>${this._formatValue(item)}</li>`).join('')}</ul>`;
                }
                return `<div class="nested-cards">${value.map((item, idx) => `
                    <div class="nested-card">
                        <div class="nested-card-header">#${idx + 1}</div>
                        <div class="nested-card-body">${this._renderNestedObject(item, 0)}</div>
                    </div>
                `).join('')}</div>`;
            } else {
                return this._renderNestedObject(value, 0);
            }
        }
        return this._formatValue(value);
    },

    _formatKey(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },

    _formatValue(value, depth = 0) {
        if (value === null || value === undefined) return '<em class="text-muted">Не указано</em>';
        if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
        if (typeof value === 'number') return value.toLocaleString('ru-RU');
        if (typeof value === 'object') {
            if (depth > 3) return `<span class="text-muted">${JSON.stringify(value)}</span>`;

            if (Array.isArray(value)) {
                if (value.length === 0) return '<em class="text-muted">Пустой список</em>';
                if (value.every(item => typeof item !== 'object')) {
                    return `<ul class="detail-list mb-0">${value.map(item => `<li>${this._formatValue(item, depth + 1)}</li>`).join('')}</ul>`;
                }
                return `<div class="nested-cards">${value.map((item, idx) => {
                    if (typeof item === 'object' && item !== null) {
                        return `<div class="nested-card">
                            <div class="nested-card-header">#${idx + 1}</div>
                            <div class="nested-card-body">${this._renderNestedObject(item, depth + 1)}</div>
                        </div>`;
                    }
                    return `<div class="nested-card-simple">${this._formatValue(item, depth + 1)}</div>`;
                }).join('')}</div>`;
            }
            return this._renderNestedObject(value, depth + 1);
        }
        return String(value);
    },

    _renderNestedObject(obj, depth = 0) {
        if (!obj || typeof obj !== 'object') return this._formatValue(obj, depth);

        const entries = Object.entries(obj);
        if (entries.length === 0) return '<em class="text-muted">Пустой объект</em>';

        return `<dl class="nested-dl mb-0">
            ${entries.map(([k, v]) => `
                <div class="dl-row">
                    <dt>${this._formatKey(k)}</dt>
                    <dd>${this._formatValue(v, depth)}</dd>
                </div>
            `).join('')}
        </dl>`;
    },

    showLoading(section) {
        const element = document.getElementById(section);
        if (!element) return;

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
            <p class="mt-3">Загрузка...</p>
        `;

        element.style.position = 'relative';
        element.appendChild(overlay);
    },

    hideLoading(section) {
        const element = document.getElementById(section);
        if (!element) return;

        const overlay = element.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => alertDiv.remove(), 5000);
    }
};
