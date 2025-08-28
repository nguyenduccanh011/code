// Minimal ES module bootstrap to expose modules on window for gradual migration
import { ChartView } from '../chart/ChartView.js';
import * as time from '../utils/time.js';
import * as math from '../utils/math.js';
import * as format from '../utils/format.js';

window.ChartView = ChartView;
window.AppUtils = { time, math, format };

