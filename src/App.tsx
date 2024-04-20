import { useEffect, useState } from 'react'
import './App.css'

import 'zingchart/es6';
import ZingChart from 'zingchart-react';

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
  const [chartType, setChartType] = useState<ChartType>('CLOB')
  const [ammData, setAmmData] = useState<MarketData[]>([])
  const [clobData, setClobData] = useState<MarketData[]>([])
  const [chartData, setChartData] = useState<any>({})

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
    if (!ammData.length || !clobData.length) return

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

    const ohlct = ammData.map(item => {
      console.log(item);
      const timestamp = new Date(item.timestamp).getTime() // / 1000; // UNIXタイムスタンプに変換
      const clob = clobData.find(d => d.timestamp === item.timestamp)!;
      return {
        time: timestamp,
        open: getValueByType(item.open, clob.open),
        high: getValueByType(item.high, clob.high),
        low: getValueByType(item.low, clob.low),
        close: getValueByType(item.close, clob.close),
      };
    });

    const volume = ammData.map(item => {
      console.log(item);
      const timestamp = new Date(item.timestamp).getTime() // / 1000; // UNIXタイムスタンプに変換
      const clob = clobData.find(d => d.timestamp === item.timestamp)!;
      return {
        time: timestamp,
        values: [item.base_volume, clob.base_volume],
      };
    });

    setChartData({
      type: "mixed",
      'scale-y': { //for Stock Chart
        'offset-start': "25%", //to adjust scale offsets.
        'min-value': Math.min(...ohlct.flatMap(item => [item.open, item.close])),
        'max-value': Math.max(...ohlct.flatMap(item => [item.open, item.close])),
      },
      'scale-y-2': { //for Volume Chart
        placement: "default", //to move scale to default (left) side.
        blended: true, //to bind the scale to "scale-y".
        'offset-end': "75%", //to adjust scale offsets.
      },
      'scale-x': { /* Scale object, set up to display as a time-series scale. Read our Time-Series Scale section further below for more information. */
        step: "6hour",
        'min-value': Math.min(...ohlct.map(item => item.time)),
        item: {
          fontSize: '10px',
        },
        transform: {
          type: "date",
          all: "%M %d, %Y"
        },
      },
      utc: true, /* Set to UTC time. */
      plot: {
        aspect: 'candlestick',
        groupBars: false, // defaults to true
        barWidth: 8,
        stacked: true,
        'trend-down': { //Stock Gain
          'background-color': "#FF453A",
          'line-color': "#FF453A",
          'border-color': "#FF453A"
        },
        'trend-up': { //Stock Loss
          'background-color': "#30D158",
          'line-color': "#30D158",
          'border-color': "#30D158"
        },
      },
      series: [
        {
          type: "stock", //Stock Chart
          scales: "scale-x,scale-y", //to set applicable scales.
          values: ohlct.map((item) => {
            return [item.time, [item.open, item.high, item.low, item.close]];
          })
        },
        {
          type: 'bar', //Volume Chart
          scales: "scale-x,scale-y-2", //to set applicable scales.
          stack: 1,
          values: volume.map((item) => {
            return [item.time, item.values[0]];
          })
        },
        {
          type: 'bar', //Volume Chart
          scales: "scale-x,scale-y-2", //to set applicable scales.
          stack: 1,
          values: volume.map((item) => {
            return [item.time, item.values[1]];
          })
        }
      ]
    })
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

      {chartData && <ZingChart width={1200} height={600} data={chartData} />}
    </>
  )
}

export default App
