import { useEffect, useRef } from 'react'
import './App.css'
import { createChart, CrosshairMode, IChartApi } from 'lightweight-charts';
import { StackedBarsSeries } from './plugins/stacked-bars-series/stacked-bars-series'

function App() {
  const candleChartRef = useRef(null);
  const barChartRef = useRef(null);
  
  useEffect(() => {
    let candleChart: IChartApi;
    let barChart: IChartApi;
    [candleChartRef, barChartRef].forEach(chartRef => {
      if (chartRef.current) {
        (chartRef.current as any).innerHTML = '';
        const chart = createChart(chartRef.current, {
          width: 800,
          height: 600,
          layout: {
            background: {
              color: '#ffffff',
            },
            textColor: 'rgba(33, 56, 77, 1)',
          },
          crosshair: {
            mode: CrosshairMode.Normal,
          },
          grid: {
            vertLines: {
              color: 'rgba(197, 203, 206, 0.5)',
            },
            horzLines: {
              color: 'rgba(197, 203, 206, 0.5)',
            },
          },
        });
        if (chartRef === candleChartRef) {
          candleChart = chart;
        } else if (chartRef === barChartRef) {
          barChart = chart;
        }
      }
    })

      const candlestickSeries = candleChart.addCandlestickSeries();
      const stackedbarSeries = barChart.addCustomSeries(new StackedBarsSeries())

      // APIからデータを取得
      const fetchData = async () => {
        try {
          const base = 'XRP'
          const counter = 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu_5553444300000000000000000000000000000000'
          // const base = 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B_USD'
          // const counter = 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq_USD'
          
          const responseAMM = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=8h&limit=321&descending=true&only_amm=true`);
          const responseCLOB = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=8h&limit=321&descending=true&exclude_amm=true`);
          
          const ammjson = (await responseAMM.json()).reverse();
          const clobjson = (await responseCLOB.json()).reverse();
          {
            const data = ammjson.map(item => {
              console.log(item);
              const timestamp = new Date(item.timestamp).getTime() / 1000; // UNIXタイムスタンプに変換
              const clob = clobjson.find(d => d.timestamp === item.timestamp);
              return {
                time: timestamp,
                open: parseFloat(item.open) / parseFloat(clob.open),
                high: parseFloat(item.high) / parseFloat(clob.high),
                low: parseFloat(item.low) / parseFloat(clob.low),
                close: parseFloat(item.close) / parseFloat(clob.close),
              };
            });
            candlestickSeries.setData(data);
          }
          
          {
            const data = ammjson.map(item => {
              console.log(item);
              const timestamp = new Date(item.timestamp).getTime() / 1000; // UNIXタイムスタンプに変換
              const clob = clobjson.find(d => d.timestamp === item.timestamp);
              return {
                time: timestamp,
                values: [parseFloat(item.base_volume), parseFloat(clob.base_volume)],
              };
            });
            stackedbarSeries.setData(data);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
      fetchData()
    }
  , [])

  return (
    <>
      <h1 style={{ color: 'red' }}>AMM price deviation from CLOB</h1>
      <div ref={candleChartRef} style={{ width: '800px', height: '600px', marginBottom: '20px' }}/>
      <div ref={barChartRef} style={{ width: '800px', height: '600px' }}/>
    </>
  )
}

export default App
