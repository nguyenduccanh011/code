class AlgoList {
    constructor() {
        this.algorithms = [
            {
                name: "Boppo_Canh",
                code: "VN30F1M",
                platform: "MB",
                winrate: "55%",
                mdd: "-8%",
                profit: "325 điểm",
                change: "+12%",
                buyConditions: [],
                sellConditions: []
            },
            {
                name: "Boppo_Canh_buy_sell",
                code: "VN30F1M",
                platform: "MB",
                winrate: "63%",
                mdd: "-5%",
                profit: "285 điểm",
                change: "+8%",
                buyConditions: [],
                sellConditions: []
            },
            {
                name: "Strategy Demo",
                code: "VNM",
                platform: "HSX",
                winrate: "60%",
                mdd: "-10%",
                profit: "40%",
                change: "+30%",
                buyConditions: [],
                sellConditions: []
            }
        ];
        this.tbody = document.getElementById('algo-table-body');
    }

    loadSavedStrategies() {
        try {
            const saved = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
            saved.forEach(strategy => {
                this.algorithms.push(strategy);
            });
        } catch (err) {
            console.error('Không thể tải chiến lược đã lưu:', err);
        }
    }

    render() {
        this.tbody.innerHTML = '';
        this.algorithms.forEach((algo, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${algo.name}</td>
                <td>${algo.code}</td>
                <td>${algo.platform}</td>
                <td>${algo.winrate}</td>
                <td>${algo.mdd}</td>
                <td>${algo.profit}</td>
                <td>${algo.change}</td>
                <td>
                    <button class="action-icon-btn run" title="Run"><i class="fa fa-play"></i></button>
                    <button class="action-icon-btn edit" title="Edit"><i class="fa fa-edit"></i></button>
                    <button class="action-icon-btn delete" title="Delete"><i class="fa fa-trash"></i></button>
                </td>
            `;
            this.tbody.appendChild(tr);

            tr.querySelector('.run').addEventListener('click', () => this.runStrategy(algo.name));
            tr.querySelector('.edit').addEventListener('click', () => this.editStrategy(algo.name));
            tr.querySelector('.delete').addEventListener('click', () => this.deleteStrategy(algo.name));
        });
    }

    saveToLocalStorage() {
        const userStrategies = this.algorithms.filter(a => a.platform === 'Builder');
        localStorage.setItem('savedStrategies', JSON.stringify(userStrategies));
    }

    runStrategy(name) {
        const strategy = this.algorithms.find(a => a.name === name);
        if (!strategy) return;
        strategyBuilderUI.loadStrategyConfig(strategy);
        strategyBuilderUI.open();
        strategyBuilderUI.testStrategy();
    }

    editStrategy(name) {
        const strategy = this.algorithms.find(a => a.name === name);
        if (!strategy) return;
        strategyBuilderUI.loadStrategyConfig(strategy);
        strategyBuilderUI.open();
    }

    deleteStrategy(name) {
        if (!confirm(`Xóa chiến lược "${name}"?`)) return;
        this.algorithms = this.algorithms.filter(a => a.name !== name);
        this.saveToLocalStorage();
        this.render();
    }

    init() {
        this.loadSavedStrategies();
        this.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const algoList = new AlgoList();
    algoList.init();

    const authorizeBtn = document.getElementById('authorize-algo-btn');
    if (authorizeBtn) {
        authorizeBtn.addEventListener('click', () => {
            strategyBuilderUI.loadStrategyConfig({
                name: '',
                buyConditions: [{ type: 'sma-crossover', params: { shortPeriod: 9, longPeriod: 20, direction: 'cắt lên' } }],
                sellConditions: [{ type: 'sma-crossover', params: { shortPeriod: 9, longPeriod: 20, direction: 'cắt xuống' } }]
            });
            strategyBuilderUI.editingStrategy = null;
            strategyBuilderUI.open();
        });
    }

    document.addEventListener('strategy-saved', (e) => {
        const s = e.detail;
        const existingIdx = algoList.algorithms.findIndex(a => a.name === s.name);
        const entry = {
            name: s.name,
            code: s.code || 'N/A',
            platform: s.platform || 'Builder',
            winrate: s.winrate || '--',
            mdd: s.mdd || '--',
            profit: s.profit || '--',
            change: s.change || '--',
            buyConditions: s.buyConditions || [],
            sellConditions: s.sellConditions || []
        };
        if (existingIdx >= 0) {
            algoList.algorithms[existingIdx] = entry;
        } else {
            algoList.algorithms.push(entry);
        }
        algoList.render();
    });
});
