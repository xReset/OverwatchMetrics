import React, { useEffect, useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import type { ComparisonData } from '@/lib/api';
import { formatHeroName, calculateChange } from '@/lib/utils';

interface DumbbellChartProps {
  data: ComparisonData[];
  metric: 'pick_rate' | 'win_rate';
}

export function DumbbellChart({ data, metric }: DumbbellChartProps) {
  const [chartKey, setChartKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    import('react-apexcharts').then((mod) => {
      setChart(() => mod.default);
    });
  }, []);

  useEffect(() => {
    if (isClient) {
      setChartKey(prev => prev + 1);
    }
  }, [data, metric, isClient]);

  const validData = data.filter(item => {
    const startValue = item.start?.[metric];
    const endValue = item.end?.[metric];
    return startValue !== null && startValue !== undefined && 
           endValue !== null && endValue !== undefined;
  });

  const chartData = validData.map(item => {
    const startValue = item.start![metric]!;
    const endValue = item.end![metric]!;
    const change = calculateChange(startValue, endValue);

    let color = '#6b7280';
    if (change !== null) {
      if (change > 0.5) color = '#22c55e';
      else if (change < -0.5) color = '#ef4444';
    }

    return {
      x: formatHeroName(item.hero),
      y: [startValue, endValue],
      fillColor: color,
      change: change || 0
    };
  });

  chartData.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // Calculate dynamic height based on number of heroes (30px per hero, min 400px)
  const chartHeight = Math.max(400, chartData.length * 30);

  const series = [{
    data: chartData
  }];

  const options: ApexOptions = {
    chart: {
      type: 'rangeBar',
      height: chartHeight,
      animations: {
        enabled: true,
        speed: 500
      },
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      selection: {
        enabled: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        isDumbbell: true,
        dumbbellColors: [['#d1d5db', '#d1d5db']]
      }
    },
    colors: chartData.map(d => d.fillColor),
    xaxis: {
      title: {
        text: metric === 'pick_rate' ? 'Pick Rate (%)' : 'Win Rate (%)'
      }
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    tooltip: {
      custom: function({ seriesIndex, dataPointIndex, w }) {
        const data = chartData[dataPointIndex];
        const change = data.change;
        const changeText = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
        const changeColor = change > 0 ? '#22c55e' : change < 0 ? '#ef4444' : '#6b7280';

        return `
          <div class="px-3 py-2 bg-gray-900 text-white rounded shadow-lg">
            <div class="font-semibold mb-1">${data.x}</div>
            <div class="text-sm">Start: ${data.y[0].toFixed(1)}%</div>
            <div class="text-sm">End: ${data.y[1].toFixed(1)}%</div>
            <div class="text-sm font-semibold mt-1" style="color: ${changeColor}">
              Change: ${changeText}
            </div>
          </div>
        `;
      }
    },
    legend: {
      show: false
    }
  };

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No data available for comparison
      </div>
    );
  }

  if (!isClient || !Chart) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading chart...
      </div>
    );
  }

  return (
    <div className="w-full">
      <Chart
        key={chartKey}
        options={options}
        series={series}
        type="rangeBar"
        height={chartHeight}
      />
    </div>
  );
}
