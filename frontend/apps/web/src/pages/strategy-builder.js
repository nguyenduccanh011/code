// Utility used by StrategyBuilderUI. If the global helper is not present
// (e.g. on pages that don't load script.js), define a minimal version here.
if (typeof areTimesEqual !== 'function') {
    function areTimesEqual(time1, time2) {
        if (!time1 || !time2) return false;
        return JSON.stringify(time1) === JSON.stringify(time2);
    }
}

class StrategyBuilderUI {
    constructor() {
        this.panel = document.getElementById('strategy-builder-panel');
        this.openBtn = document.getElementById('strategy-builder-btn');
        this.closeBtn = document.getElementById('close-strategy-builder');
        this.editingStrategy = null;

        this.registerEvents();

        if (window.location.hash === '#builder') {
            this.open();
        }
    }

    registerEvents() {
        if (this.openBtn) {
            this.openBtn.addEventListener('click', () => this.open());
        }
        this.closeBtn.addEventListener('click', () => this.close());

        window.addEventListener('click', (event) => {
            if (event.target === this.panel) {
                this.close();
            }
        });

        document.getElementById('add-buy-condition').addEventListener('click', () => {
            this.addCondition('buy-conditions');
        });
        document.getElementById('add-sell-condition').addEventListener('click', () => {
            this.addCondition('sell-conditions');
        });

        document.getElementById('test-strategy-btn').addEventListener('click', () => this.testStrategy());
        document.getElementById('save-strategy-btn').addEventListener('click', () => this.saveStrategy());
        document.getElementById('load-strategy-btn').addEventListener('click', () => this.loadStrategy());
    }

    open() {
        this.panel.style.display = 'block';
    }

    close() {
        this.panel.style.display = 'none';
    }

    addCondition(containerId, conditionType = 'sma-crossover', params = null) {
        const container = document.getElementById(containerId);
        const conditionItem = document.createElement('div');
        conditionItem.className = 'condition-item';

        let paramsHtml = '';
        if (conditionType === 'sma-crossover') {
            const shortVal = params?.shortPeriod ?? '';
            const longVal = params?.longPeriod ?? '';
            const direction = params?.direction === 'cắt xuống' ? 'cắt xuống' : 'cắt lên';
            paramsHtml = `
                <input type="number" class="param-input" placeholder="9" min="1" max="100" value="${shortVal}">
                <span>${direction}</span>
                <input type="number" class="param-input" placeholder="20" min="1" max="100" value="${longVal}">
            `;
        } else if (conditionType === 'rsi') {
            const op = params?.operator ?? '<';
            const val = params?.value ?? '';
            paramsHtml = `
                <span>RSI</span>
                <select class="param-input">
                    <option value="<" ${op === '<' ? 'selected' : ''}><</option>
                    <option value=">" ${op === '>' ? 'selected' : ''}>></option>
                </select>
                <input type="number" class="param-input" placeholder="30" min="0" max="100" value="${val}">
            `;
        } else if (conditionType === 'price') {
            const op = params?.operator ?? '<';
            const val = params?.value ?? '';
            paramsHtml = `
                <span>Giá</span>
                <select class="param-input">
                    <option value="<" ${op === '<' ? 'selected' : ''}><</option>
                    <option value=">" ${op === '>' ? 'selected' : ''}>></option>
                </select>
                <input type="number" class="param-input" placeholder="1000" min="0" step="0.01" value="${val}">
            `;
        }

        conditionItem.innerHTML = `
            <select class="condition-type">
                <option value="sma-crossover" ${conditionType === 'sma-crossover' ? 'selected' : ''}>SMA Crossover</option>
                <option value="rsi" ${conditionType === 'rsi' ? 'selected' : ''}>RSI</option>
                <option value="price" ${conditionType === 'price' ? 'selected' : ''}>Giá</option>
            </select>
            <div class="condition-params">
                ${paramsHtml}
            </div>
            <button class="remove-condition-btn">&times;</button>
        `;

        const typeSelect = conditionItem.querySelector('.condition-type');
        typeSelect.addEventListener('change', (e) => {
            const newType = e.target.value;
            const paramsDiv = conditionItem.querySelector('.condition-params');
            let newParamsHtml = '';

            if (newType === 'sma-crossover') {
                newParamsHtml = `
                    <input type="number" class="param-input" placeholder="9" min="1" max="100">
                    <span>cắt lên</span>
                    <input type="number" class="param-input" placeholder="20" min="1" max="100">
                `;
            } else if (newType === 'rsi') {
                newParamsHtml = `
                    <span>RSI</span>
                    <select class="param-input">
                        <option value="<"><</option>
                        <option value=">">></option>
                    </select>
                    <input type="number" class="param-input" placeholder="30" min="0" max="100">
                `;
            } else if (newType === 'price') {
                newParamsHtml = `
                    <span>Giá</span>
                    <select class="param-input">
                        <option value="<"><</option>
                        <option value=">">></option>
                    </select>
                    <input type="number" class="param-input" placeholder="1000" min="0" step="0.01">
                `;
            }

            paramsDiv.innerHTML = newParamsHtml;
        });

        const removeBtn = conditionItem.querySelector('.remove-condition-btn');
        removeBtn.addEventListener('click', () => {
            conditionItem.remove();
        });

        container.appendChild(conditionItem);
    }

    rebuildConditions(containerId, conditions) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        conditions.forEach(cond => this.addCondition(containerId, cond.type, cond.params));
    }

        loadStrategyConfig(strategy) {
            document.getElementById('strategy-name').value = strategy.name || '';
            document.getElementById('strategy-code').value = strategy.code || '';
            this.rebuildConditions('buy-conditions', strategy.buyConditions || []);
            this.rebuildConditions('sell-conditions', strategy.sellConditions || []);
            this.editingStrategy = strategy;
        }

        async testStrategy() {
            console.log('Testing strategy...');

            const symbolInput = document.getElementById('strategy-code').value.trim().toUpperCase();
            const fallbackSymbol = typeof currentSymbol !== 'undefined' ? currentSymbol : 'VNINDEX';
            const symbol = symbolInput || this.editingStrategy?.code || fallbackSymbol;

            try {
                if (typeof initialLoad === 'function' && strategyEngine.mainChart && strategyEngine.mainSeries) {
                    const timeframe = document.querySelector('.timeframe-button.active')?.textContent || 'D';
                    if (typeof currentSymbol !== 'undefined') currentSymbol = symbol;
                    await initialLoad(symbol, timeframe);
                } else {
                    currentCandlestickData = await dataProvider.getHistory(symbol, 'D');
                }
            } catch (err) {
                console.error('Không thể tải dữ liệu để test:', err);
            }

          if (!currentCandlestickData || currentCandlestickData.length === 0) {
              alert('Không có dữ liệu để test chiến lược. Vui lòng tải dữ liệu trước.');
              return;
          }

          try {
              // Hiển thị marker tín hiệu ở client như cũ
              const markers = strategyEngine.runStrategy(currentCandlestickData);
              if (markers.length > 0 && strategyEngine.mainChart && strategyEngine.mainSeries) {
                  strategyEngine.displayMarkers(markers);
                  const firstMarkerTime = markers[0].time;
                  const dataWithTime = currentCandlestickData.map((d, index) => ({ ...d, originalIndex: index }));
                  const dataPoint = dataWithTime.find(d => areTimesEqual(d.time, firstMarkerTime));
                  if (dataPoint) {
                      mainChart.timeScale().scrollToPosition(dataPoint.originalIndex, true);
                  }
              }

              // Gọi backend để backtest và lấy metrics
              const config = strategyEngine.readStrategyConfig();
              const backtestPayload = {
                  prices: currentCandlestickData,
                  buyConditions: config.buyConditions,
                  sellConditions: config.sellConditions,
                  settings: { initialCapital: 100000000, fee: 0.0015 }
              };
              const result = await dataProvider.runBacktest(backtestPayload);
              if (result && result.metrics) {
                  const m = result.metrics;
                  const win = (m.winrate * 100).toFixed(2) + '%';
                  const mdd = '-' + (m.max_drawdown * 100).toFixed(2) + '%';
                  const profitPercent = (m.total_return * 100).toFixed(2);
                  const profit = profitPercent + '%';
                  const change = (m.total_return >= 0 ? '+' : '') + profitPercent + '%';
                  alert(`Backtest hoàn tất!\nWinrate: ${win}\nMDD: ${mdd}\nLợi nhuận: ${profit}`);
                  this.editingStrategy = {
                      ...config,
                      code: symbol,
                      platform: this.editingStrategy?.platform || 'Builder',
                      winrate: win,
                      mdd: mdd,
                      profit: profit,
                      change: change
                  };
              } else {
                  alert('Backtest không trả về kết quả hợp lệ.');
              }
          } catch (error) {
              console.error('Lỗi khi backtest:', error);
              alert('Có lỗi xảy ra khi backtest: ' + error.message);
          }
      }

      saveStrategy() {
          const config = strategyEngine.readStrategyConfig();
          const code = document.getElementById('strategy-code').value.trim().toUpperCase();
          const strategy = {
              ...config,
              code: code || 'N/A',
              platform: this.editingStrategy?.platform || 'Builder',
              winrate: this.editingStrategy?.winrate || '--',
              mdd: this.editingStrategy?.mdd || '--',
              profit: this.editingStrategy?.profit || '--',
              change: this.editingStrategy?.change || '--'
          };
          const saved = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
          const idx = saved.findIndex(s => s.name === strategy.name);
          if (idx >= 0) {
              saved[idx] = strategy;
          } else {
              saved.push(strategy);
          }
          localStorage.setItem('savedStrategies', JSON.stringify(saved));
          alert(`Đã lưu chiến lược "${strategy.name}"`);
          document.dispatchEvent(new CustomEvent('strategy-saved', { detail: strategy }));
          this.editingStrategy = null;
          this.close();
      }

      loadStrategy() {
          const saved = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
          if (!saved.length) {
              alert('Không có chiến lược đã lưu');
              return;
          }
          const name = prompt('Nhập tên chiến lược muốn tải:\n' + saved.map(s => s.name).join('\n'));
          const strategy = saved.find(s => s.name === name);
          if (!strategy) {
              alert('Không tìm thấy chiến lược');
              return;
          }
          document.getElementById('strategy-name').value = strategy.name;
          document.getElementById('strategy-code').value = strategy.code || '';
          this.rebuildConditions('buy-conditions', strategy.buyConditions);
          this.rebuildConditions('sell-conditions', strategy.sellConditions);
          alert(`Đã tải chiến lược "${name}"`);
      }
  }

window.strategyBuilderUI = new StrategyBuilderUI();
