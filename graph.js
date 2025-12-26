/**
 * demos.js - Граф судебного дела
 *
 * Визуализация онтологии судебного спора:
 * - Стороны (истец, ответчик, третьи лица)
 * - Правоотношения (договор, предмет спора)
 * - Требования и возражения
 * - Доказательства сторон
 * - Нормы права
 * - Решение суда
 */

const CaseGraph = {
    network: null,
    nodes: null,
    edges: null,
    selectedNode: null,

    // Цветовая схема по типам узлов
    colors: {
        plaintiff: { background: '#667eea', border: '#5a67d8', font: '#fff' },
        defendant: { background: '#e53e3e', border: '#c53030', font: '#fff' },
        thirdParty: { background: '#ed8936', border: '#dd6b20', font: '#fff' },
        contract: { background: '#38a169', border: '#2f855a', font: '#fff' },
        claim: { background: '#d69e2e', border: '#b7791f', font: '#fff' },
        evidence: { background: '#4299e1', border: '#3182ce', font: '#fff' },
        court: { background: '#805ad5', border: '#6b46c1', font: '#fff' },
        norm: { background: '#319795', border: '#2c7a7b', font: '#fff' },
        result: { background: '#48bb78', border: '#38a169', font: '#fff' },
        resultNegative: { background: '#fc8181', border: '#f56565', font: '#fff' },
    },

    render(container) {
        const data = this.getData();
        if (!data) {
            this.showNoData(container);
            return;
        }

        container.innerHTML = `
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

                <div id="graphContainer" class="graph-container"></div>

                <div class="graph-legend">
                    <div class="legend-title">Легенда:</div>
                    <div class="legend-items">
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.plaintiff.background}"></span>Истец</span>
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.defendant.background}"></span>Ответчик</span>
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.contract.background}"></span>Договор</span>
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.claim.background}"></span>Требования</span>
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.evidence.background}"></span>Доказательства</span>
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.norm.background}"></span>Нормы права</span>
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.court.background}"></span>Суд</span>
                        <span class="legend-item"><span class="legend-dot" style="background:${this.colors.result.background}"></span>Результат</span>
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

        this.buildGraph(data);
        this.initControls();
    },

    buildGraph(data) {
        // Проверяем новый формат с узлами и связями
        if (data.узлы && data.связи) {
            this.buildGraphFromNewFormat(data);
            return;
        }

        const nodesArray = [];
        const edgesArray = [];
        let nodeId = 1;
        const nodeIds = {};

        // Истец
        const plaintiff = data.стороны?.истец;
        if (plaintiff) {
            const name = typeof plaintiff === 'object' ? plaintiff.наименование : plaintiff;
            const inn = typeof plaintiff === 'object' ? plaintiff.инн : null;
            nodeIds.plaintiff = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(name, 20),
                group: 'plaintiff',
                x: -280, y: 120,
                data: { type: 'plaintiff', name, inn, full: plaintiff }
            });
        }

        // Ответчик
        const defendant = data.стороны?.ответчик;
        if (defendant) {
            const name = typeof defendant === 'object' ? defendant.наименование : defendant;
            const inn = typeof defendant === 'object' ? defendant.инн : null;
            nodeIds.defendant = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(name, 20),
                group: 'defendant',
                x: 280, y: 120,
                data: { type: 'defendant', name, inn, full: defendant }
            });
        }

        // Третьи лица
        const thirdParties = data.стороны?.третьи_лица || [];
        thirdParties.forEach((tp, idx) => {
            const name = typeof tp === 'object' ? tp.наименование : tp;
            nodeIds[`thirdParty_${idx}`] = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(name, 18),
                group: 'thirdParty',
                x: 0, y: 220 + idx * 60,
                data: { type: 'thirdParty', name, full: tp }
            });
        });

        // Договор
        const contract = data.суть_спора?.договор;
        if (contract) {
            const contractLabel = contract.вид || 'Договор';
            const contractNum = contract.номер_дата || '';
            nodeIds.contract = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(contractLabel, 18) + (contractNum ? `\n${this.wrapText(contractNum, 18)}` : ''),
                group: 'contract',
                x: 0, y: 120,
                data: { type: 'contract', full: contract }
            });

            if (nodeIds.plaintiff) {
                edgesArray.push({ from: nodeIds.plaintiff, to: nodeIds.contract, label: 'заключил', arrows: 'to' });
            }
            if (nodeIds.defendant) {
                edgesArray.push({ from: nodeIds.defendant, to: nodeIds.contract, label: 'заключил', arrows: 'to' });
            }
        }

        // Требования
        const claim = data.суть_спора;
        if (claim) {
            const claimAmount = claim.цена_иска?.итого || claim.цена_иска?.основной_долг;
            const claimText = claim.предмет_иска || 'Требования истца';
            nodeIds.claim = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(claimText, 20) + (claimAmount ? `\n${this.formatMoney(claimAmount)}` : ''),
                group: 'claim',
                x: 0, y: 0,
                data: { type: 'claim', full: claim }
            });

            if (nodeIds.plaintiff) {
                edgesArray.push({ from: nodeIds.plaintiff, to: nodeIds.claim, label: 'заявил', arrows: 'to' });
            }
            if (nodeIds.contract) {
                edgesArray.push({ from: nodeIds.claim, to: nodeIds.contract, label: 'по договору', arrows: 'to', dashes: true });
            }
        }

        // Доказательства истца
        const plaintiffEvidence = data.позиция_истца?.ключевые_доказательства || [];
        if (plaintiffEvidence.length > 0) {
            nodeIds.plaintiffEvidence = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: `Доказательства\nистца (${plaintiffEvidence.length})`,
                group: 'evidence',
                x: -280, y: 220,
                data: { type: 'evidence', side: 'plaintiff', items: plaintiffEvidence }
            });

            if (nodeIds.plaintiff) {
                edgesArray.push({ from: nodeIds.plaintiff, to: nodeIds.plaintiffEvidence, label: 'представил', arrows: 'to' });
            }
        }

        // Доказательства ответчика
        const defendantEvidence = data.позиция_ответчика?.ключевые_доказательства || [];
        const defendantObjections = data.позиция_ответчика?.основные_возражения || [];

        if (defendantEvidence.length > 0 || defendantObjections.length > 0) {
            nodeIds.defendantEvidence = nodeId;
            const items = [...defendantEvidence, ...defendantObjections.map(o => `[Возражение] ${o}`)];
            nodesArray.push({
                id: nodeId++,
                label: `Позиция\nответчика (${items.length})`,
                group: 'evidence',
                x: 280, y: 220,
                data: { type: 'evidence', side: 'defendant', items, full: data.позиция_ответчика }
            });

            if (nodeIds.defendant) {
                edgesArray.push({ from: nodeIds.defendant, to: nodeIds.defendantEvidence, label: 'представил', arrows: 'to' });
            }

            if (nodeIds.claim && defendantObjections.length > 0) {
                edgesArray.push({
                    from: nodeIds.defendantEvidence,
                    to: nodeIds.claim,
                    label: 'возражает',
                    arrows: 'to',
                    dashes: true,
                    color: { color: '#e53e3e', opacity: 0.6 }
                });
            }
        }

        // Суд
        const courtName = data.карточка_дела?.суд;
        if (courtName) {
            nodeIds.court = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: this.wrapText(courtName, 22),
                group: 'court',
                x: 0, y: -120,
                data: { type: 'court', name: courtName, full: data.карточка_дела }
            });

            if (nodeIds.claim) {
                edgesArray.push({ from: nodeIds.claim, to: nodeIds.court, label: 'рассмотрел', arrows: 'to' });
            }
            if (nodeIds.plaintiffEvidence) {
                edgesArray.push({ from: nodeIds.plaintiffEvidence, to: nodeIds.court, label: 'исследовал', arrows: 'to', dashes: true });
            }
            if (nodeIds.defendantEvidence) {
                edgesArray.push({ from: nodeIds.defendantEvidence, to: nodeIds.court, label: 'исследовал', arrows: 'to', dashes: true });
            }
        }

        // Нормы права
        const norms = data.выводы_суда?.применённые_нормы || [];
        if (norms.length > 0) {
            nodeIds.norms = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: `Нормы права\n(${norms.length})`,
                group: 'norm',
                x: -200, y: -200,
                data: { type: 'norm', items: norms }
            });

            if (nodeIds.court) {
                edgesArray.push({ from: nodeIds.court, to: nodeIds.norms, label: 'применил', arrows: 'to' });
            }
        }

        // Результат
        const result = data.результат;
        if (result) {
            const isWin = (result.исход || '').toLowerCase().includes('удовлетвор');
            const awarded = result.взыскано?.итого || result.взыскано?.основной_долг;
            nodeIds.result = nodeId;
            nodesArray.push({
                id: nodeId++,
                label: `${result.исход || 'Решение'}${awarded ? '\n' + this.formatMoney(awarded) : ''}`,
                group: isWin ? 'result' : 'resultNegative',
                x: 200, y: -200,
                data: { type: 'result', isWin, full: result }
            });

            if (nodeIds.court) {
                edgesArray.push({ from: nodeIds.court, to: nodeIds.result, label: 'решил', arrows: 'to' });
            }

            if (isWin && nodeIds.plaintiff) {
                edgesArray.push({
                    from: nodeIds.result,
                    to: nodeIds.plaintiff,
                    label: 'в пользу',
                    arrows: 'to',
                    color: { color: '#48bb78' },
                    width: 3
                });
            } else if (!isWin && nodeIds.defendant) {
                edgesArray.push({
                    from: nodeIds.result,
                    to: nodeIds.defendant,
                    label: 'в пользу',
                    arrows: 'to',
                    color: { color: '#48bb78' },
                    width: 3
                });
            }
        }

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
            groups: this.buildGroups(),
            physics: { enabled: false },
            interaction: { hover: true, tooltipDelay: 0, zoomView: true, dragView: true }
        };

        this.network = new vis.Network(container, { nodes: this.nodes, edges: this.edges }, options);

        this.network.once('afterDrawing', () => {
            this.network.fit({ animation: false });
        });

        this.network.on('click', (params) => this.onNodeClick(params));
        this.network.on('hoverNode', () => container.style.cursor = 'pointer');
        this.network.on('blurNode', () => container.style.cursor = 'default');
    },

    buildGraphFromNewFormat(data) {
        const nodesArray = data.узлы.map((node, idx) => ({
            id: node.id,
            label: node.label,
            color: {
                background: node.цвет || '#667eea',
                border: this.darkenColor(node.цвет || '#667eea'),
                highlight: { background: node.цвет || '#667eea', border: '#333' },
                hover: { background: node.цвет || '#667eea', border: '#333' }
            },
            font: { color: '#fff' },
            data: { type: node.тип, subtype: node.подтип, full: node.данные }
        }));

        const edgesArray = data.связи.map(edge => ({
            from: edge.от,
            to: edge.к,
            label: edge.тип,
            arrows: 'to',
            dashes: edge.стиль === 'dashed'
        }));

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
            physics: {
                enabled: true,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 150,
                    springConstant: 0.08
                },
                stabilization: { iterations: 100 }
            },
            interaction: { hover: true, tooltipDelay: 0, zoomView: true, dragView: true }
        };

        this.network = new vis.Network(container, { nodes: this.nodes, edges: this.edges }, options);

        this.network.once('stabilizationIterationsDone', () => {
            this.network.setOptions({ physics: false });
            this.network.fit({ animation: true });
        });

        this.network.on('click', (params) => this.onNodeClick(params));
        this.network.on('hoverNode', () => container.style.cursor = 'pointer');
        this.network.on('blurNode', () => container.style.cursor = 'default');
    },

    darkenColor(hex) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - 30);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - 30);
        const b = Math.max(0, (num & 0x0000FF) - 30);
        return '#' + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
    },

    buildGroups() {
        const groups = {};
        for (const [key, colors] of Object.entries(this.colors)) {
            groups[key] = {
                color: {
                    background: colors.background,
                    border: colors.border,
                    highlight: { background: colors.background, border: '#333' },
                    hover: { background: colors.background, border: '#333' }
                },
                font: { color: colors.font }
            };
        }
        return groups;
    },

    initControls() {
        document.getElementById('graphZoomIn')?.addEventListener('click', () => {
            const scale = this.network.getScale() * 1.3;
            this.network.moveTo({ scale });
        });

        document.getElementById('graphZoomOut')?.addEventListener('click', () => {
            const scale = this.network.getScale() / 1.3;
            this.network.moveTo({ scale });
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

        const typeNames = {
            plaintiff: 'Истец',
            defendant: 'Ответчик',
            thirdParty: 'Третье лицо',
            contract: 'Договор',
            claim: 'Требования',
            evidence: 'Доказательства',
            court: 'Суд',
            norm: 'Нормы права',
            result: 'Результат'
        };

        titleEl.innerHTML = `<i class="fas fa-info-circle"></i> ${typeNames[nodeData.type] || 'Информация'}`;

        let html = '';

        if (nodeData.full && typeof nodeData.full === 'object') {
            html = this.renderObjectDetails(nodeData.full);
        } else if (nodeData.items) {
            html = '<ul class="details-list">' + nodeData.items.map(i => `<li>${i}</li>`).join('') + '</ul>';
        } else if (nodeData.name) {
            html = `<p><strong>${nodeData.name}</strong></p>`;
            if (nodeData.inn) html += `<p class="text-muted">ИНН: ${nodeData.inn}</p>`;
        }

        contentEl.innerHTML = html || '<p class="text-muted">Нет дополнительной информации</p>';
        detailsEl.classList.remove('hidden');
    },

    renderObjectDetails(obj, depth = 0) {
        if (depth > 2) return '<span class="text-muted">...</span>';

        let html = '<dl class="details-dl">';
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined || value === '') continue;

            const label = this.formatKey(key);

            if (Array.isArray(value)) {
                html += `<dt>${label}</dt><dd><ul class="details-list">`;
                value.slice(0, 5).forEach(item => {
                    if (typeof item === 'object') {
                        html += `<li>${this.renderObjectDetails(item, depth + 1)}</li>`;
                    } else {
                        html += `<li>${item}</li>`;
                    }
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

    getData() {
        if (!window.AppState) return null;
        // Сначала проверяем загруженный граф
        if (window.AppState.currentGraphData) {
            return window.AppState.currentGraphData;
        }
        const cacheKey = `${window.AppState.currentUploadFolder || window.AppState.currentCaseNumber}_${window.AppState.currentMode}`;
        return window.AppState.cachedAnalysis?.[cacheKey] || window.AppState.extractedData;
    },

    async loadAndRender(container) {
        // Попробуем загрузить граф из файла
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
        // Fallback на обычные данные анализа
        window.AppState.currentGraphData = null;
        this.render(container);
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

    init() {
        const graphBtn = document.querySelector('.demo-btn[data-demo="graph"]');
        if (!graphBtn) return;

        graphBtn.addEventListener('click', async () => {
            const container = document.getElementById('analysisContent');
            if (container) {
                graphBtn.classList.add('active');
                container.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div><p class="mt-2">Загрузка графа...</p></div>';
                await this.loadAndRender(container);
            }
        });
    }
};

// Экспорт в window
window.CaseGraph = CaseGraph;

// Автоинициализация
document.addEventListener('DOMContentLoaded', () => CaseGraph.init());
