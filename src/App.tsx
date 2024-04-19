import { useEffect, useRef, useState } from 'react'
import './App.css'
import { createChart, CrosshairMode, UTCTimestamp } from 'lightweight-charts';
import { StackedBarsSeries } from './plugins/stacked-bars-series/stacked-bars-series'

type ChartType = 'AMM' | 'CLOB' | 'DEVIATION'

type MarketData = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  base_volume: number;
  counter_volume: number;
  exchanges: number
}

function App() {
  const chartRef = useRef(null);
  const [chartType, setChartType] = useState<ChartType>('CLOB')
  const [ammData, setAmmData] = useState<MarketData[]>([])
  const [clobData, setClobData] = useState<MarketData[]>([])

  useEffect(() => {
    const fetchChartData = async () => {
      const base = 'XRP'
      const counter = 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu_5553444300000000000000000000000000000000'
      // const base = 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B_USD'
      // const counter = 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq_USD'

      const responseAMM = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=8h&limit=321&descending=true&only_amm=true`);
      const responseCLOB = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=8h&limit=321&descending=true&exclude_amm=true`);

      const ammjson = (await responseAMM.json()).reverse();
      const clobjson = (await responseCLOB.json()).reverse();
      setAmmData(ammjson)
      setClobData(clobjson)
    }
    fetchChartData()
  }, [])

  useEffect(() => {
    if(!ammData.length || !clobData.length) return
    if (!chartRef.current) return
    (chartRef.current as any).innerHTML = '';
    const chart = createChart(chartRef.current, {
      width: 800,
      height: 600,
      rightPriceScale: {
        visible: true,
      },
      leftPriceScale: {
        visible: true,
        borderVisible: false,
      },
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


    const candlestickSeries = chart.addCandlestickSeries({
      priceScaleId: 'right',
    });
    const stackedbarSeries = chart.addCustomSeries(new StackedBarsSeries(), {
      priceScaleId: 'left',
      autoscaleInfoProvider: (original: any) => {
        const res = original();
        if (res !== null) {
          res.priceRange.minValue = 0;
          res.priceRange.maxValue *= 5;
        }
        return res;
      }
    })

    const getValueByType = (amm: number, clob: number) => {
      if (chartType === 'AMM') {
        return amm;
      }
      if (chartType === 'CLOB') {
        return clob;
      }
      if (chartType === 'DEVIATION') {
        return amm / clob;
      }
      throw new Error('Invalid chart type');
    }

    {
      const data = ammData.map(item => {
        console.log(item);
        const timestamp = new Date(item.timestamp).getTime() / 1000; // UNIXタイムスタンプに変換
        const clob = clobData.find(d => d.timestamp === item.timestamp)!;
        return {
          time: timestamp as UTCTimestamp,
          open: getValueByType(item.open, clob.open),
          high: getValueByType(item.high, clob.high),
          low: getValueByType(item.low, clob.low),
          close: getValueByType(item.close, clob.close),
        };
      });
      candlestickSeries.setData(data);
    }

    {
      const data = ammData.map(item => {
        console.log(item);
        const timestamp = new Date(item.timestamp).getTime() / 1000; // UNIXタイムスタンプに変換
        const clob = clobData.find(d => d.timestamp === item.timestamp)!;
        return {
          time: timestamp as UTCTimestamp,
          values: [item.base_volume, clob.base_volume],
        };
      });
      stackedbarSeries.setData(data);
    }
  }, [ammData, chartType, clobData])

  return (
    <>
      <h1 style={{ color: 'red' }}>XRP AMM/CLOB Chart</h1>
      <h2>{chartType}</h2>
      <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
        <option value="AMM">AMM</option>
        <option value="CLOB">CLOB</option>
        <option value="DEVIATION">DEVIATION</option>
      </select>
      <div ref={chartRef} style={{ width: '800px', height: '600px', marginBottom: '20px' }} />
    </>
  )
}

export default App
