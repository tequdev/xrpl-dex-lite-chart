import { useEffect, useState } from 'react'
import './App.css'

import 'zingchart/es6';
import ZingChart from 'zingchart-react';
import 'zingchart/modules-es6/zingchart-depth.min.js';

type ChartType = 'ALL' | 'AMM' | 'CLOB'

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
  const [pair, setPair] = useState<Record<'base' | 'counter', string>>()
  const [chartType, setChartType] = useState<ChartType>('CLOB')
  const [ammData, setAmmData] = useState<MarketData[]>([])
  const [clobData, setClobData] = useState<MarketData[]>([])
  const [allData, setAllData] = useState<MarketData[]>([])

  const [chartData, setChartData] = useState<any>({})

  useEffect(() => {
    const base = 'XRP'
    const counter = 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu_5553444300000000000000000000000000000000'
    // const counter = 'rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz_534F4C4F00000000000000000000000000000000'
    // const base = 'rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL_BTC'
    // const base = 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B_USD'
    // const counter = 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq_USD'
    // const counter = 'rsxkrpsYaeTUdciSFJwvto7MKSrgGnvYvA_5A52505900000000000000000000000000000000'

    setPair({
      base,
      counter,
    })
  }, [])

  useEffect(() => {
    const fetchChartData = async () => {
      if (!pair) return
      const { base, counter } = pair

      const responseAMM = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=8h&limit=321&descending=true&only_amm=true`);
      const responseCLOB = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=8h&limit=321&descending=true&exclude_amm=true`);
      const responseALL = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=8h&limit=321&descending=true`);

      const ammjson = (await responseAMM.json()).reverse();
      const clobjson = (await responseCLOB.json()).reverse();
      const alljson = (await responseALL.json()).reverse();
      setAmmData(ammjson)
      setClobData(clobjson)
      setAllData(alljson)
    }
    fetchChartData()
  }, [pair])

  useEffect(() => {
    if (!ammData.length || !clobData.length) return

    const ohlct = ammData.map(item => {
      const timestamp = new Date(item.timestamp).getTime() // / 1000; // UNIXタイムスタンプに変換
      const data = (chartType === 'ALL' ? allData : chartType === 'AMM' ? ammData : clobData).find(d => d.timestamp === item.timestamp)!;
      return {
        time: timestamp,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
      };
    });

    const volume = ammData.map(item => {
      const timestamp = new Date(item.timestamp).getTime() // / 1000; // UNIXタイムスタンプに変換
      const clob = clobData.find(d => d.timestamp === item.timestamp)!;
      let values: number[] = []

      if (chartType === 'ALL') {
        values = [item.base_volume, clob.base_volume]
      }
      if (chartType === 'AMM') {
        values = [item.base_volume]
      }
      if (chartType === 'CLOB') {
        values = [clob.base_volume]
      }

      return {
        time: timestamp,
        values,
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
  }, [allData, ammData, chartType, clobData])

  return (
    <>
      <h1 style={{ color: 'red' }}>XRP AMM/CLOB Chart</h1>
      <h2>{pair?.counter}/{pair?.base}</h2>
      <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
        <option value="ALL">ALL</option>
        <option value="AMM">AMM</option>
        <option value="CLOB">CLOB</option>
      </select>
      {chartData && <ZingChart id="chart" width={1280} height={600} data={chartData} />}
    </>
  )
}

export default App
