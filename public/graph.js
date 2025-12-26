/**
 * demos.js - Динамический граф судебного дела
 *
 * Поддерживает два режима:
 * 1. Динамический - данные графа (узлы/связи) от LLM
 * 2. Legacy - построение из аналитических данных
 */

const CaseGraph = {
    network: null,
    nodes: null,
    edges: null,
    graphData: null,

    // Цветовая схема по типам узлов
    defaultColors: {
        'сторона': { истец: '#667eea', ответчик: '#e53e3e', третье_лицо: '#ed8936' },
        'документ': '#38a169',
        'требования': '#d69e2e',
        'доказательства': { принятое: '#4299e1', отклонённое: '#a0aec0' },
        'возражения': '#fc8181',
        'суд': '#805ad5',
        'нормы': '#319795',
        'результат': { удовлетворено: '#48bb78', частично: '#ecc94b', отказано: '#fc8181' }
    },

    // ========================================
    // ГЛАВНЫЙ МЕТОД РЕНДЕРА
    // ========================================

    render(container) {
        const data = this.getData();
        if (!data) {
            this.showNoData(container);
            return;
        }

        // Проверяем: это динамический граф или legacy формат
        if (data.узлы && data.связи) {
            this.graphData = data;
            this.renderDynamic(container, data);
        } else {
            // Legacy режим - строим из аналитических данных
            this.renderLegacy(container, data);
        }
    },

    // ========================================
    // ДИНАМИЧЕСКИЙ РЕНДЕР (новый формат)
    // ========================================

    renderDynamic(container, data) {
        container.innerHTML = this.getContainerHTML(data.meta);

        const nodesArray = [];
        const edgesArray = [];

        // Автоматическое расположение узлов
        const positions = this.calculatePositions(data.узлы);

        // Создаём узлы
        data.узлы.forEach((node) => {
            const pos = positions[node.id] || { x: 0, y: 0 };
            const color = node.цвет || this.getColorForType(node.тип, node.подтип);

            nodesArray.push({
                id: node.id,
                label: this.wrapText(node.label, 22),
                color: {
                    background: color,
                    border: this.darkenColor(color),
                    highlight: { background: color, border: '#333' },
                    hover: { background: color, border: '#333' }
                },
                font: { color: '#fff', size: 13 },
                x: pos.x,
                y: pos.y,
                data: node  // Сохраняем все данные узла
            });
        });

        // Создаём связи
        data.связи.forEach(edge => {
            edgesArray.push({
                from: edge.от,
                to: edge.к,
                label: edge.тип,
                arrows: 'to',
                dashes: edge.стиль === 'dashed',
                color: edge.цвет ? { color: edge.цвет } : undefined,
                width: edge.толщина || 1.5
            });
        });

        this.createNetwork(nodesArray, edgesArray);
    },

    calculatePositions(nodes) {
        const positions = {};

        // Чёткая вертикальная иерархия:
        //
        //     ИСТЕЦ <────── ДОГОВОР ──────> ОТВЕТЧИК    (y: -200)
        //                      │
        //                      v
        //                 ТРЕБОВАНИЯ                     (y: -50)
        //                      │
        //          ┌───────────┴───────────┐
        //          v                       v
        //    ДОКАЗАТЕЛЬСТВА          ВОЗРАЖЕНИЯ          (y: 100)
        //          │                       │
        //          └───────────┬───────────┘
        //                      v
        //                     СУД                        (y: 250)
        //                      │
        //          ┌───────────┴───────────┐
        //          v                       v
        //    НОРМЫ ПРАВА              РЕЗУЛЬТАТ          (y: 400)

        nodes.forEach(node => {
            const type = node.тип;
            const subtype = node.подтип;

            // Уровень 1: Стороны и Договор (верх)
            if (type === 'сторона') {
                if (subtype === 'истец') {
                    positions[node.id] = { x: -300, y: -200 };
                } else if (subtype === 'ответчик') {
                    positions[node.id] = { x: 300, y: -200 };
                } else {
                    positions[node.id] = { x: 400, y: -150 };
                }
            }
            else if (type === 'документ') {
                positions[node.id] = { x: 0, y: -200 };
            }
            // Уровень 2: Требования (центр-верх)
            else if (type === 'требования') {
                positions[node.id] = { x: 0, y: -50 };
            }
            // Уровень 3: Доказательства / Возражения
            else if (type === 'доказательства') {
                positions[node.id] = { x: -220, y: 100 };
            }
            else if (type === 'возражения') {
                positions[node.id] = { x: 220, y: 100 };
            }
            // Уровень 4: Суд (центр-низ)
            else if (type === 'суд') {
                positions[node.id] = { x: 0, y: 250 };
            }
            // Уровень 5: Нормы и Результат (низ)
            else if (type === 'нормы') {
                positions[node.id] = { x: -200, y: 400 };
            }
            else if (type === 'результат') {
                positions[node.id] = { x: 200, y: 400 };
            }
            // Fallback
            else {
                positions[node.id] = { x: 0, y: 0 };
            }
        });

        return positions;
    },

    getColorForType(type, subtype) {
        const colors = this.defaultColors[type];
        if (!colors) return '#718096';
        if (typeof colors === 'string') return colors;
        return colors[subtype] || Object.values(colors)[0] || '#718096';
    },

    darkenColor(hex) {
        if (!hex || hex[0] !== '#') return '#333';
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - 30);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - 30);
        const b = Math.max(0, (num & 0x0000FF) - 30);
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    },

    // ========================================
    // LEGACY РЕНДЕР (старый формат analytic/detail)
    // ========================================

    renderLegacy(container, data) {
        container.innerHTML = this.getContainerHTML();
        this.buildLegacyGraph(data);
    },

    buildLegacyGraph(data) {
        const nodesArray = [];
        const edgesArray = [];
        const nodeIds = {};
        let nodeId = 1;

        // Цвета для legacy режима
        const colors = {
            plaintiff: '#667eea',
            defendant: '#e53e3e',
            thirdParty: '#ed8936',
            contract: '#38a169',
            claim: '#d69e2e',
            evidence: '#4299e1',
            court: '#805ad5',
            norm: '#319795',
            result: '#48bb78',
            resultNegative: '#fc8181'
        };

        // --- СТОРОНЫ ---
        const plaintiff = data.стороны?.истец;
        if (plaintiff) {
            const name = typeof plaintiff === 'object' ? plaintiff.наименование : plaintiff;
            nodeIds.plaintiff = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(name, 20),
                color: { background: colors.plaintiff, border: this.darkenColor(colors.plaintiff) },
                font: { color: '#fff' },
                x: -280, y: 120,
                data: { тип: 'сторона', подтип: 'истец', label: name, данные: plaintiff }
            });
        }

        const defendant = data.стороны?.ответчик;
        if (defendant) {
            const name = typeof defendant === 'object' ? defendant.наименование : defendant;
            nodeIds.defendant = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(name, 20),
                color: { background: colors.defendant, border: this.darkenColor(colors.defendant) },
                font: { color: '#fff' },
                x: 280, y: 120,
                data: { тип: 'сторона', подтип: 'ответчик', label: name, данные: defendant }
            });
        }

        // Третьи лица
        (data.стороны?.третьи_лица || []).forEach((tp, idx) => {
            const name = typeof tp === 'object' ? tp.наименование : tp;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(name, 18),
                color: { background: colors.thirdParty, border: this.darkenColor(colors.thirdParty) },
                font: { color: '#fff' },
                x: 0, y: 200 + idx * 60,
                data: { тип: 'сторона', подтип: 'третье_лицо', label: name, данные: tp }
            });
        });

        // --- ДОГОВОР ---
        const contract = data.суть_спора?.договор;
        if (contract) {
            const label = contract.вид || 'Договор';
            nodeIds.contract = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(label, 18),
                color: { background: colors.contract, border: this.darkenColor(colors.contract) },
                font: { color: '#fff' },
                x: 0, y: 120,
                data: { тип: 'документ', подтип: 'договор', label, данные: contract }
            });

            if (nodeIds.plaintiff) {
                edgesArray.push({ from: nodeIds.plaintiff, to: nodeIds.contract, label: 'заключил', arrows: 'to' });
            }
            if (nodeIds.defendant) {
                edgesArray.push({ from: nodeIds.defendant, to: nodeIds.contract, label: 'заключил', arrows: 'to' });
            }
        }

        // --- ТРЕБОВАНИЯ ---
        const claim = data.суть_спора;
        if (claim) {
            const amount = claim.цена_иска?.итого || claim.цена_иска?.основной_долг;
            const text = claim.предмет_иска || 'Требования истца';
            nodeIds.claim = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(text, 20) + (amount ? `\n${this.formatMoney(amount)}` : ''),
                color: { background: colors.claim, border: this.darkenColor(colors.claim) },
                font: { color: '#fff' },
                x: 0, y: 0,
                data: { тип: 'требование', label: text, данные: claim }
            });

            if (nodeIds.plaintiff) {
                edgesArray.push({ from: nodeIds.plaintiff, to: nodeIds.claim, label: 'заявил', arrows: 'to' });
            }
            if (nodeIds.contract) {
                edgesArray.push({ from: nodeIds.claim, to: nodeIds.contract, label: 'по договору', arrows: 'to', dashes: true });
            }
        }

        // --- ДОКАЗАТЕЛЬСТВА ---
        const plaintiffEvidence = data.позиция_истца?.ключевые_доказательства || [];
        if (plaintiffEvidence.length > 0) {
            nodeIds.plaintiffEvidence = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: `Доказательства\nистца (${plaintiffEvidence.length})`,
                color: { background: colors.evidence, border: this.darkenColor(colors.evidence) },
                font: { color: '#fff' },
                x: -280, y: 220,
                data: { тип: 'доказательство', подтип: 'принятое', label: 'Доказательства истца', данные: { items: plaintiffEvidence } }
            });

            if (nodeIds.plaintiff) {
                edgesArray.push({ from: nodeIds.plaintiff, to: nodeIds.plaintiffEvidence, label: 'представил', arrows: 'to' });
            }
        }

        const defendantEvidence = data.позиция_ответчика?.ключевые_доказательства || [];
        const defendantObjections = data.позиция_ответчика?.основные_возражения || [];
        if (defendantEvidence.length > 0 || defendantObjections.length > 0) {
            nodeIds.defendantEvidence = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: `Позиция\nответчика`,
                color: { background: colors.evidence, border: this.darkenColor(colors.evidence) },
                font: { color: '#fff' },
                x: 280, y: 220,
                data: { тип: 'возражение', label: 'Позиция ответчика', данные: data.позиция_ответчика }
            });

            if (nodeIds.defendant) {
                edgesArray.push({ from: nodeIds.defendant, to: nodeIds.defendantEvidence, label: 'представил', arrows: 'to' });
            }
            if (nodeIds.claim && defendantObjections.length > 0) {
                edgesArray.push({ from: nodeIds.defendantEvidence, to: nodeIds.claim, label: 'оспаривает', arrows: 'to', dashes: true, color: { color: '#e53e3e' } });
            }
        }

        // --- СУД ---
        const courtName = data.карточка_дела?.суд;
        if (courtName) {
            nodeIds.court = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(courtName, 22),
                color: { background: colors.court, border: this.darkenColor(colors.court) },
                font: { color: '#fff' },
                x: 0, y: -120,
                data: { тип: 'суд', label: courtName, данные: data.карточка_дела }
            });

            if (nodeIds.claim) {
                edgesArray.push({ from: nodeIds.claim, to: nodeIds.court, label: 'рассмотрел', arrows: 'to' });
            }
        }

        // --- НОРМЫ ---
        const norms = data.выводы_суда?.применённые_нормы || [];
        if (norms.length > 0) {
            nodeIds.norms = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: `Нормы права\n(${norms.length})`,
                color: { background: colors.norm, border: this.darkenColor(colors.norm) },
                font: { color: '#fff' },
                x: -200, y: -200,
                data: { тип: 'норма', label: 'Нормы права', данные: { items: norms } }
            });

            if (nodeIds.court) {
                edgesArray.push({ from: nodeIds.court, to: nodeIds.norms, label: 'применил', arrows: 'to' });
            }
        }

        // --- РЕЗУЛЬТАТ ---
        const result = data.результат;
        if (result) {
            const isWin = (result.исход || '').toLowerCase().includes('удовлетвор');
            const awarded = result.взыскано?.итого || result.взыскано?.основной_долг;
            const resultColor = isWin ? colors.result : colors.resultNegative;

            nodeIds.result = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: `${result.исход || 'Решение'}${awarded ? '\n' + this.formatMoney(awarded) : ''}`,
                color: { background: resultColor, border: this.darkenColor(resultColor) },
                font: { color: '#fff' },
                x: 200, y: -200,
                data: { тип: 'результат', подтип: isWin ? 'удовлетворено' : 'отказано', label: result.исход, данные: result }
            });

            if (nodeIds.court) {
                edgesArray.push({ from: nodeIds.court, to: nodeIds.result, label: 'решил', arrows: 'to' });
            }

            const winner = isWin ? nodeIds.plaintiff : nodeIds.defendant;
            if (winner) {
                edgesArray.push({ from: nodeIds.result, to: winner, label: 'в пользу', arrows: 'to', color: { color: '#48bb78' }, width: 3 });
            }
        }

        this.createNetwork(nodesArray, edgesArray);
    },

    // ========================================
    // СОЗДАНИЕ СЕТИ VIS.JS
    // ========================================

    createNetwork(nodesArray, edgesArray) {
        this.nodes = new vis.DataSet(nodesArray);
        this.edges = new vis.DataSet(edgesArray);

        const container = document.getElementById('graphContainer');
        if (!container || !window.vis) {
            console.error('Graph container or vis.js not found');
            return;
        }

        const options = {
            nodes: {
                shape: 'box',
                margin: 12,
                widthConstraint: { minimum: 100, maximum: 200 },
                font: { size: 13, face: 'Arial', multi: true },
                borderWidth: 2,
                shadow: { enabled: true, size: 5, x: 2, y: 2 }
            },
            edges: {
                font: { size: 11, color: '#555', strokeWidth: 0 },
                color: { color: '#999', highlight: '#667eea' },
                smooth: { type: 'curvedCW', roundness: 0.15 },
                width: 1.5
            },
            physics: { enabled: false },
            interaction: {
                hover: true,
                tooltipDelay: 0,
                zoomView: true,
                dragView: true,
                dragNodes: true
            }
        };

        this.network = new vis.Network(container, { nodes: this.nodes, edges: this.edges }, options);

        this.network.once('afterDrawing', () => {
            this.network.fit({ animation: false });
        });

        this.network.on('click', (params) => this.onNodeClick(params));
        this.network.on('hoverNode', () => container.style.cursor = 'pointer');
        this.network.on('blurNode', () => container.style.cursor = 'default');

        this.initControls();
    },

    // ========================================
    // КОНТЕЙНЕР HTML
    // ========================================

    getContainerHTML(meta = null) {
        const metaHtml = meta ? `
            <div class="graph-meta">
                <span class="meta-item"><strong>${meta.номер_дела || ''}</strong></span>
                <span class="meta-item">${meta.суд || ''}</span>
                <span class="meta-item badge ${meta.исход === 'удовлетворено' ? 'bg-success' : meta.исход === 'отказано' ? 'bg-danger' : 'bg-warning'}">${meta.исход || ''}</span>
            </div>
        ` : '';

        return `
            <div class="graph-wrapper">
                <div class="graph-header">
                    <h6><i class="fas fa-project-diagram"></i> Граф дела</h6>
                    <div class="graph-controls">
                        <button class="btn btn-sm btn-outline-secondary" id="graphZoomIn" title="Приблизить">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" id="graphZoomOut" title="Отдалить">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" id="graphFit" title="Вписать">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                ${metaHtml}
                <div id="graphContainer" class="graph-container"></div>
                <div class="graph-legend">
                    <div class="legend-title">Легенда:</div>
                    <div class="legend-items">
                        <span class="legend-item"><span class="legend-dot" style="background:#667eea"></span>Истец</span>
                        <span class="legend-item"><span class="legend-dot" style="background:#e53e3e"></span>Ответчик</span>
                        <span class="legend-item"><span class="legend-dot" style="background:#38a169"></span>Договор</span>
                        <span class="legend-item"><span class="legend-dot" style="background:#d69e2e"></span>Требования</span>
                        <span class="legend-item"><span class="legend-dot" style="background:#4299e1"></span>Доказательства</span>
                        <span class="legend-item"><span class="legend-dot" style="background:#319795"></span>Нормы</span>
                        <span class="legend-item"><span class="legend-dot" style="background:#805ad5"></span>Суд</span>
                        <span class="legend-item"><span class="legend-dot" style="background:#48bb78"></span>Результат</span>
                    </div>
                </div>
                <div id="nodeDetails" class="node-details hidden">
                    <div class="node-details-header">
                        <span id="nodeDetailsTitle"></span>
                        <button class="btn-close-details" id="closeNodeDetails">&times;</button>
                    </div>
                    <div id="nodeDetailsContent"></div>
                </div>
            </div>
        `;
    },

    // ========================================
    // ИНТЕРАКТИВНОСТЬ
    // ========================================

    initControls() {
        document.getElementById('graphZoomIn')?.addEventListener('click', () => {
            this.network.moveTo({ scale: this.network.getScale() * 1.3 });
        });

        document.getElementById('graphZoomOut')?.addEventListener('click', () => {
            this.network.moveTo({ scale: this.network.getScale() / 1.3 });
        });

        document.getElementById('graphFit')?.addEventListener('click', () => {
            this.network.fit({ animation: true });
        });

        document.getElementById('closeNodeDetails')?.addEventListener('click', () => {
            document.getElementById('nodeDetails')?.classList.add('hidden');
        });
    },

    onNodeClick(params) {
        if (params.nodes.length === 0) {
            document.getElementById('nodeDetails')?.classList.add('hidden');
            return;
        }

        const nodeId = params.nodes[0];
        const node = this.nodes.get(nodeId);
        if (!node || !node.data) return;

        this.showNodeDetails(node.data);
    },

    showNodeDetails(nodeData) {
        const detailsEl = document.getElementById('nodeDetails');
        const titleEl = document.getElementById('nodeDetailsTitle');
        const contentEl = document.getElementById('nodeDetailsContent');

        if (!detailsEl || !titleEl || !contentEl) return;

        // Заголовок
        const typeLabel = nodeData.тип ? `${nodeData.тип}${nodeData.подтип ? ` (${nodeData.подтип})` : ''}` : 'Информация';
        titleEl.innerHTML = `<i class="fas fa-info-circle"></i> ${typeLabel}`;

        // Контент
        let html = `<h6 class="node-label">${(nodeData.label || '').replace(/\n/g, ' ')}</h6>`;

        const dataObj = nodeData.данные || nodeData.data || nodeData.full;
        if (dataObj) {
            // Обработка сгруппированных данных
            if (dataObj.состав && Array.isArray(dataObj.состав)) {
                // Требования
                if (dataObj.всего) html += `<p class="mb-2"><strong>Всего:</strong> ${dataObj.всего}</p>`;
                html += '<div class="grouped-items">';
                dataObj.состав.forEach(item => {
                    html += `<div class="grouped-item">
                        <strong>${item.вид || 'Требование'}</strong>
                        ${item.сумма ? `<span class="badge bg-warning text-dark">${item.сумма}</span>` : ''}
                        ${item.основание ? `<div class="small text-muted">${item.основание}</div>` : ''}
                        ${item.период ? `<div class="small text-muted">Период: ${item.период}</div>` : ''}
                    </div>`;
                });
                html += '</div>';
            } else if (dataObj.применено && Array.isArray(dataObj.применено)) {
                // Нормы права
                html += '<div class="grouped-items">';
                dataObj.применено.forEach(item => {
                    html += `<div class="grouped-item">
                        <strong>${item.статья || item}</strong>
                        ${item.суть ? `<div class="small text-muted">${item.суть}</div>` : ''}
                    </div>`;
                });
                html += '</div>';
            } else if (dataObj.принято && Array.isArray(dataObj.принято)) {
                // Доказательства
                html += '<div class="grouped-items">';
                dataObj.принято.forEach(item => {
                    html += `<div class="grouped-item">
                        <strong>${item.вид || 'Документ'}</strong>
                        ${item.реквизиты ? `<span class="small text-muted ms-2">${item.реквизиты}</span>` : ''}
                    </div>`;
                });
                html += '</div>';
            } else if (dataObj.аргументы && Array.isArray(dataObj.аргументы)) {
                // Возражения
                html += `<p class="mb-2"><strong>Позиция:</strong> ${dataObj.позиция || ''}</p>`;
                html += '<ul class="details-list">';
                dataObj.аргументы.forEach(arg => {
                    html += `<li>${arg}</li>`;
                });
                html += '</ul>';
            } else if (dataObj.items && Array.isArray(dataObj.items)) {
                html += '<ul class="details-list">' + dataObj.items.map(i =>
                    typeof i === 'string' ? `<li>${i}</li>` : `<li>${JSON.stringify(i)}</li>`
                ).join('') + '</ul>';
            } else if (typeof dataObj === 'object') {
                html += this.renderObjectDetails(dataObj);
            } else {
                html += `<p>${dataObj}</p>`;
            }
        }

        contentEl.innerHTML = html || '<p class="text-muted">Нет дополнительной информации</p>';
        detailsEl.classList.remove('hidden');
    },

    renderObjectDetails(obj, depth = 0) {
        if (depth > 2) return '<span class="text-muted">...</span>';

        let html = '<dl class="details-dl">';
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined || value === '' || key === 'items') continue;

            const label = this.formatKey(key);

            if (Array.isArray(value)) {
                html += `<dt>${label}</dt><dd><ul class="details-list">`;
                value.slice(0, 5).forEach(item => {
                    html += typeof item === 'object'
                        ? `<li>${this.renderObjectDetails(item, depth + 1)}</li>`
                        : `<li>${item}</li>`;
                });
                if (value.length > 5) html += `<li class="text-muted">...и ещё ${value.length - 5}</li>`;
                html += '</ul></dd>';
            } else if (typeof value === 'object') {
                html += `<dt>${label}</dt><dd>${this.renderObjectDetails(value, depth + 1)}</dd>`;
            } else {
                html += `<dt>${label}</dt><dd>${value}</dd>`;
            }
        }
        html += '</dl>';
        return html;
    },

    // ========================================
    // ХЕЛПЕРЫ
    // ========================================

    getData() {
        if (!window.AppState) return null;

        // Сначала проверяем загруженные данные графа
        if (window.AppState.currentGraphData) {
            return window.AppState.currentGraphData;
        }

        // Fallback на текущие аналитические данные
        const cacheKey = `${window.AppState.currentUploadFolder || window.AppState.currentCaseNumber}_${window.AppState.currentMode}`;
        return window.AppState.cachedAnalysis?.[cacheKey] || window.AppState.extractedData;
    },

    showNoData(container) {
        container.innerHTML = `
            <div class="graph-placeholder">
                <i class="fas fa-project-diagram fa-4x mb-3"></i>
                <h5>Граф недоступен</h5>
                <p>Сначала выполните анализ документа</p>
            </div>
        `;
    },

    formatMoney(amount) {
        if (!amount || isNaN(amount)) return '';
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            maximumFractionDigits: 0
        }).format(amount);
    },

    formatKey(key) {
        return key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
    },

    wrapText(text, maxLen) {
        if (!text) return '';
        if (text.length <= maxLen) return text;

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + ' ' + word).trim().length <= maxLen) {
                currentLine = (currentLine + ' ' + word).trim();
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word.length > maxLen ? word.substring(0, maxLen - 2) + '..' : word;
            }
        });
        if (currentLine) lines.push(currentLine);

        return lines.slice(0, 3).join('\n');
    },

    // ========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ========================================

    init() {
        const graphBtn = document.querySelector('.demo-btn[data-demo="graph"]');
        if (!graphBtn) return;

        graphBtn.addEventListener('click', async () => {
            const container = document.getElementById('analysisContent');
            if (!container) return;

            graphBtn.classList.add('active');

            // Показываем загрузку
            container.innerHTML = `
                <div class="graph-placeholder">
                    <div class="spinner-border text-primary mb-3" role="status"></div>
                    <h5>Загрузка графа...</h5>
                </div>
            `;

            // Пытаемся загрузить данные графа из файла
            if (window.AppState?.currentUploadFolder) {
                try {
                    const response = await fetch(`/user_uploads/${window.AppState.currentUploadFolder}/_analysis_graph.json`);
                    if (response.ok) {
                        const graphData = await response.json();
                        window.AppState.currentGraphData = graphData;
                        this.render(container);
                        return;
                    }
                } catch (e) {
                    console.log('No graph file, using analysis data');
                }
            }

            // Fallback - используем аналитические данные
            window.AppState.currentGraphData = null;
            const data = this.getData();
            if (data) {
                this.render(container);
            } else {
                this.showNoData(container);
            }
        });
    }
};

// Экспорт в window
window.CaseGraph = CaseGraph;

// Автоинициализация
document.addEventListener('DOMContentLoaded', () => CaseGraph.init());
