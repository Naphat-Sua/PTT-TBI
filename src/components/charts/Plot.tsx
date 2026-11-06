/**
 * Plotly chart component backed by the finance-only Plotly bundle
 * (scatter, bar, candlestick, OHLC...), roughly a quarter of the size
 * of the full plotly.js build. Import this lazily.
 */
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-finance-dist-min';

const Plot = createPlotlyComponent(Plotly);

export default Plot;
