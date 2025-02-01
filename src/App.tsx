import { useCallback, useEffect, useState, useRef } from 'react'
import './App.css'

import { CandlestickSeries, createChart, UTCTimestamp, LineSeries } from 'lightweight-charts';
import { Currency } from 'xrpl';
import { StackedBarsSeries } from './plugins/stacked-bars-series/stacked-bars-series';
import { StackedBarsData } from './plugins/stacked-bars-series/data';
// import { TooltipPrimitive } from './plugins/tooltip/tooltip';

type ChartType = 'ALL' | 'AMM' | 'CLOB'
type IntervalType = '1d' | '12h' | '8h' | '4h' | '1h' | '30m' | '15m'

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
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedPool, setSelectedPool] = useState<number>(0)
  const [pair, setPair] = useState<Record<'base' | 'counter', string> & Record<'baseInfo' | 'counterInfo', { name: string }>>()
  const [chartType, setChartType] = useState<ChartType>('ALL')
  const [ammData, setAmmData] = useState<MarketData[]>([])
  const [clobData, setClobData] = useState<MarketData[]>([])
  const [allData, setAllData] = useState<MarketData[]>([])
  const [interval, setInterval] = useState<IntervalType>('8h')

  const chartContainerRef = useRef<HTMLDivElement>(null);

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
      const { base, counter } = pair
      setLoading(true)
      const responseAMM = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=${interval}&limit=321&descending=true&only_amm=true`);
      const responseCLOB = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=${interval}&limit=321&descending=true&exclude_amm=true`);
      const responseALL = await fetch(`https://data.xrplf.org/v1/iou/market_data/${base}/${counter}?interval=${interval}&limit=321&descending=true`);

      const ammjson = (await responseAMM.json()).reverse();
      const clobjson = (await responseCLOB.json()).reverse();
      const alljson = (await responseALL.json()).reverse();
      setAmmData(ammjson)
      setClobData(clobjson)
      setAllData(alljson)
      setLoading(false)
    }
    fetchChartData()
  }, [pair, interval])

  useEffect(() => {
    if (!ammData.length || !clobData.length || !chartContainerRef.current) return

    const ohlc = ammData.map((item) => {
      const timeSeconds = Math.floor(new Date(item.timestamp).getTime() / 1000);
      const data = (chartType === 'ALL' ? allData : chartType === 'AMM' ? ammData : clobData)
        .find(d => d.timestamp === item.timestamp)!;
      return {
        time: timeSeconds as UTCTimestamp,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
      };
    });

    const volumeData1 = ammData.map((item) => {
      const timeSeconds = Math.floor(new Date(item.timestamp).getTime() / 1000);
      let value = 0;
      if (chartType === 'ALL' || chartType === 'AMM') {
        value = item.base_volume;
      }
      return {
        time: timeSeconds as UTCTimestamp,
        value,
        color: '#26a69a',
      };
    });
    const volumeData2 = ammData.map((item) => {
      const timeSeconds = Math.floor(new Date(item.timestamp).getTime() / 1000);
      let value = 0;
      if (chartType === 'ALL' || chartType === 'CLOB') {
        const clob = clobData.find(d => d.timestamp === item.timestamp)!;
        value = clob.base_volume;
      }
      return {
        time: timeSeconds as UTCTimestamp,
        value,
        color: '#ff0000',
      };
    });

    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      // width: 1280,
      // height: 600,
      layout: {
        background: {
          color: '#ffffff',
        },
        textColor: '#000'
      },
      timeScale: {
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    chart.applyOptions({
      localization: {
        dateFormat: 'dd MMM \'yy'
      },
    });
    chart.applyOptions({
      localization: {
        locale: 'ja-JP',
        dateFormat: 'yyyy-MM-dd',
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries)
    candleSeries.setData(ohlc);

    // const tooltipPrimitive = new TooltipPrimitive({
    //   lineColor: 'rgba(0, 0, 0, 0.2)',
    //   tooltip: {
    //     followMode: 'tracking',
    //   },
    // });
    // candleSeries.attachPrimitive(tooltipPrimitive);

    const volumeSeriesView = new StackedBarsSeries();
    const volumeSeries = chart.addCustomSeries(volumeSeriesView, {
      color: 'black',
      priceScaleId: '',
      priceFormat: { type: 'volume' },
    });
    const stackedDataSource1: StackedBarsData[] = volumeData1.map(d => ({ time: d.time, values: [d.value] }))
    const stackedDataSource2: StackedBarsData[] = volumeData2.map(d => ({ time: d.time, values: [d.value] }))
    const stackedData = stackedDataSource1.map(d => ({ time: d.time, values: [d.values[0], stackedDataSource2.find(d2 => d2.time === d.time)!.values[0]] }))
    const data: (StackedBarsData)[] = stackedData;
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })
    volumeSeries.setData(data);

    return () => {
      chart.remove();
    };
  }, [allData, ammData, clobData, chartType])

  // 価格比較チャート用の新しいuseEffect
  const priceCompareChartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ammData.length || !clobData.length || !priceCompareChartRef.current) return

    // AMM価格データ
    const ammPriceData = ammData.map((item) => {
      const timeSeconds = Math.floor(new Date(item.timestamp).getTime() / 1000);
      return {
        time: timeSeconds as UTCTimestamp,
        value: item.close,
      };
    });

    // CLOB価格データ
    const clobPriceData = clobData.map((item) => {
      const timeSeconds = Math.floor(new Date(item.timestamp).getTime() / 1000);
      return {
        time: timeSeconds as UTCTimestamp,
        value: item.close,
      };
    });

    priceCompareChartRef.current.innerHTML = '';

    const priceCompareChart = createChart(priceCompareChartRef.current, {
      autoSize: true,
      layout: {
        background: {
          color: '#ffffff',
        },
        textColor: '#000'
      },
      timeScale: {
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    priceCompareChart.applyOptions({
      localization: {
        locale: 'ja-JP',
        dateFormat: 'yyyy-MM-dd',
      },
    });

    // AMM価格ライン
    const ammPriceSeries = priceCompareChart.addSeries(LineSeries, {
      color: '#26a69a',
      lineWidth: 2,
      title: 'AMM Price',
    });
    ammPriceSeries.setData(ammPriceData);

    // CLOB価格ライン
    const clobPriceSeries = priceCompareChart.addSeries(LineSeries, {
      color: '#ff0000',
      lineWidth: 2,
      title: 'CLOB Price',
    });
    clobPriceSeries.setData(clobPriceData);

    return () => {
      priceCompareChart.remove();
    };
  }, [ammData, clobData]);

  return (
    <>
      <h1 className='text-4xl font-semibold my-12'>XRPL AMM/CLOB Chart</h1>
      <div className="flex justify-center gap-4 mb-4">
        <select className='select select-bordered max-w-xs text-xl' value={selectedPool.toString()} onChange={(e) => setSelectedPool(parseInt(e.target.value))}>
          {pools.map((pool, index) => {
            const counter = getAssetName(pool.Asset2Name, pool.Asset2)
            const base = getAssetName(pool.AssetName, pool.Asset)
            return <option key={pool.index} value={index}>{counter}/{base}</option>
          })}
        </select>
        <select className='select select-bordered max-w-xs text-xl' value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
          <option value="ALL">ALL</option>
          <option value="AMM">AMM</option>
          <option value="CLOB">CLOB</option>
        </select>
        <select className='select select-bordered max-w-xs text-xl' value={interval} onChange={(e) => setInterval(e.target.value as IntervalType)}>
          <option value="1d">1d</option>
          <option value="12h">12h</option>
          <option value="8h">8h</option>
          <option value="4h">4h</option>
          <option value="1h">1h</option>
          <option value="30m">30m</option>
          <option value="15m">15m</option>
        </select>
      </div>
      {
        (!loading && ammData.length && clobData.length)
          ? (
            <div className="flex flex-col items-center gap-12">
              <div className="flex flex-col items-center">
                <div ref={chartContainerRef} className="w-[1280px] h-[600px]" />
                <div className="w-[1280px] flex justify-end gap-6 mt-4 text-sm">
                  {
                    [{label: 'AMM Volume', color: '#26a69a'}, {label: 'CLOB Volume', color: '#ff0000'}].map(({label, color}) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="w-4 h-4" style={{ backgroundColor: color }} />
                        <span>{label}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-semibold mb-4">AMM/CLOB Price Changes</h2>
                <div ref={priceCompareChartRef} className="w-[1280px] h-[400px]" />
                <div className="w-[1280px] flex justify-end gap-6 mt-4 text-sm">
                  {
                    [{label: 'AMM Price', color: '#26a69a'}, {label: 'CLOB Price', color: '#ff0000'}].map(({label, color}) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="w-4 h-4" style={{ backgroundColor: color }} />
                        <span>{label}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )
          : (
            <div className='w-[1280px] h-[600px] flex items-center justify-center'>
              <span className="loading loading-bars loading-lg" />
            </div>
          )
      }
    </>
  )
}

export default App
