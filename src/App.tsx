import { useCallback, useEffect, useState } from 'react'
import './App.css'

import 'zingchart/es6';
import ZingChart from 'zingchart-react';
import 'zingchart/modules-es6/zingchart-depth.min.js';
import { Currency } from 'xrpl';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAssetName = (AssetName: any, Asset: any) => {
  if (AssetName?.name) return AssetName.name
  if (AssetName?.username) return `${AssetName.username} ${Asset.currency}`
  return 'XRP'
}

function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pools, setPools] = useState<any[]>([])
  const [selectedPool, setSelectedPool] = useState<number>(0)
  const [pair, setPair] = useState<Record<'base' | 'counter', string> & Record<'baseInfo' | 'counterInfo', { name: string }>>()
  const [chartType, setChartType] = useState<ChartType>('ALL')
  const [ammData, setAmmData] = useState<MarketData[]>([])
  const [clobData, setClobData] = useState<MarketData[]>([])
  const [allData, setAllData] = useState<MarketData[]>([])

  const [chartData, setChartData] = useState<any>()

  useEffect(() => {
    const f = async () => {
      const response = await fetch('https://api.xrpscan.com/api/v1/amm/pools')
      const data = await response.json()
      const p = data.filter((d) => (!d.Asset.issuer || d.AssetName) && (!d.Asset2.issuer || d.Asset2Name))
      console.log(p)
      setPools(p)
    }
    f()
  }, [])

  const selectPairFromPool = useCallback((index: number) => {
    if (pools.length === 0) return
    const assetToApiAsset = (asset: Currency) => {
      if (asset.currency === 'XRP')
        return 'XRP'
      return `${asset.issuer}_${asset.currency}`
    }
    const top = pools[index]
    const base = assetToApiAsset(top.Asset)
    const baseInfo = { name: getAssetName(top.AssetName, top.Asset) }
    const counter = assetToApiAsset(top.Asset2)
    const counterInfo = { name: getAssetName(top.Asset2Name, top.Asset2) }

    setPair({
      base,
      counter,
      baseInfo,
      counterInfo
    })
  }, [pools])

  useEffect(() => {
    if (pools.length === 0) return
    selectPairFromPool(selectedPool)
  }, [pools, selectPairFromPool, selectedPool])

  useEffect(() => {
    const fetchChartData = async () => {
      if (!pair) return
      setChartData(undefined)
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
        values = [item.base_volume, 0]
      }
      if (chartType === 'CLOB') {
        values = [0, clob.base_volume]
      }

      return {
        time: timestamp,
        values,
      };
    });

    setChartData({
      type: "mixed",
      preview: {},
      'scale-y': { //for Stock Chart
        zooming: true,
        'offset-start': "25%", //to adjust scale offsets.
        'min-value': Math.min(...ohlct.flatMap(item => [item.open, item.close])),
        'max-value': Math.max(...ohlct.flatMap(item => [item.open, item.close])),
      },
      'scale-y-2': { //for Volume Chart
        zooming: true,
        placement: "default", //to move scale to default (left) side.
        blended: true, //to bind the scale to "scale-y".
        'offset-end': "75%", //to adjust scale offsets.
      },
      'scale-x': { /* Scale object, set up to display as a time-series scale. Read our Time-Series Scale section further below for more information. */
        step: "6hour",
        zooming: true,
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
      <h1 className='text-4xl font-semibold my-12'>XRPL AMM/CLOB Chart</h1>
      <select className='select select-bordered max-w-xs text-xl' value={selectedPool.toString()} onChange={(e) => setSelectedPool(parseInt(e.target.value))}>
        {pools.map((pool, index) => {
          const counter = getAssetName(pool.Asset2Name, pool.Asset2)
          const base = getAssetName(pool.AssetName, pool.Asset)
          return <option key={pool.index} value={index}>{counter}/{base}</option>
        }
        )}
      </select>
      <select className='select select-bordered max-w-xs text-xl' value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
        <option value="ALL">ALL</option>
        <option value="AMM">AMM</option>
        <option value="CLOB">CLOB</option>
      </select>
      {
        chartData ?
          <ZingChart id="chart" width={1280} height={600} data={chartData} /> :
          <div className='w-[1280px] h-[600px] flex align-center justify-center'>
            <span className="loading loading-bars loading-lg" />
          </div>
      }
    </>
  )
}

export default App
