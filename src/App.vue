<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as jStat from 'jstat'
import * as d3 from 'd3'
import * as echarts from 'echarts'
import { confidenceEllipse, convalHull, hex2Rgba } from './helper';

const d3Dom = ref()
const echarts0Dom = ref()
const echarts1Dom = ref()

// 共用的测试数据
const data = function (numPoints: number) {
  const item: any = { x: [], y: [] };
  for (let i = 0; i < numPoints; i++) {
    item.x[i] = jStat.normal.inv(Math.random(), 8.5, 4);
    item.y[i] = jStat.normal.inv(Math.random(), 6.5, 3);
    item.y[i] += item.x[i] * 1.1;
  }
  return item;
}(100)

// 前两个图表共用的置信椭圆参数
const ellipse = confidenceEllipse(data);

// 用d3绘制一个散点图
const d3Chart = () => {
  const width = d3Dom.value.offsetWidth, height = d3Dom.value.offsetHeight, margin = 25,
    xExtent: any = d3.extent(data.x), yExtent: any = d3.extent(data.y),
    svg = d3.select('#d3Chart').append('svg').attr('width', width).attr('height', height).append('g').attr('transform', 'translate(25,25)'),
    xScale = d3.scaleLinear().range([margin, width - margin * 2]).domain(xExtent),
    yScale = d3.scaleLinear().range([height - margin * 2, 0]).domain(yExtent),
    xAxis = d3.axisBottom(xScale),
    yAxis = d3.axisLeft(yScale);

  svg.append('g').attr('class', 'axis').attr('transform', 'translate(' + margin + ',0)').call(yAxis);
  svg.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + (height - margin * 2) + ')').call(xAxis);

  svg.append('ellipse').attr('class', 'ellipse')
    .attr('rx', Math.abs(xScale(xExtent[0] + ellipse.rx) - xScale(xExtent[0])))
    .attr('ry', Math.abs(yScale(yExtent[0] + ellipse.ry) - yScale(yExtent[0])))
    .attr('transform', 'translate(' + xScale(ellipse.cx) + ',' + yScale(ellipse.cy) + ') rotate(' + ellipse.orient + ')');

  svg.selectAll('circle').data(data.x).enter()
    .append('circle')
    .attr('cx', function (d, i) {
      console.log(d);
      return xScale(data.x[i])
    })
    .attr('cy', function (d, i) {
      console.log(d);
      return yScale(data.y[i])
    })
    .attr('r', 3)
    .style('fill', '#cfc')
    .style('stroke', '#0af')
    .style('stroke-width', 1)
    .style('opacity', 0.5);
}

// 用echarts绘制一个散点图，再加一个椭圆的graphic
const echarts0 = () => {
  const chart = echarts.init(echarts0Dom.value);
  chart.setOption({
    grid: { top: 25, right: 25, bottom: 25, left: 40 },
    tooltip: {},
    xAxis: {},
    yAxis: {},
    legend: {},
    series: [
      {
        type: 'scatter',
        encode: { tooltip: [0, 1] },
        symbolSize: 6,
        itemStyle: {
          color: hex2Rgba('#cfc', 0.5),
          borderColor: '#0af'
        },
        data: data.x.map((num: number, i: number) => {
          return [num, data.y[i]]
        })
      }
    ]
  });

  const cxy = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [ellipse.cx, ellipse.cy]),
    rxy = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [ellipse.rx, ellipse.ry]),
    zeroxy = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [0, 0]),
    options = chart.getOption();

  options.graphic = [
    {
      type: 'ellipse',
      shape: {
        cx: cxy[0], cy: cxy[1],
        // 这里ECharts只提供了 转换坐标系上的点到像素坐标值 方法，没有提供 距离转换方法，因此长轴、短轴的像素距离，通过和(0,0)的差值计算而来
        rx: rxy[0] - zeroxy[0], ry: rxy[1] - zeroxy[1]
      },
      style: { fill: 'rgba(0,0,0,0)', stroke: 'steelblue' },
      rotation: ellipse.orientForECharts,
      originX: cxy[0],
      originY: cxy[1]
    }
  ];
  chart.setOption(options);
}

// 用echarts绘制一个散点图，再加一个自定义的多边形系列
const echarts1 = () => {
  const chart = echarts.init(echarts1Dom.value),
    polygons: any = convalHull(data.x.map((num: number, i: number) => {
      return { x: num, y: data.y[i] }
    }));

  const renderItem = (params: any, api: any) => {
    if (params.context.rendered) {
      return;
    }
    params.context.rendered = true;
    let points = [];
    for (let i = 0; i < polygons.length; i++) {
      points.push(api.coord([polygons[i].x, polygons[i].y]));
    }
    return {
      type: 'polygon',
      transition: ['shape'],
      shape: {
        points: points
      },
      style: api.style({
        fill: 'rgba(0,0,0,0)',
        stroke: 'steelblue'
      })
    };
  };

  chart.setOption({
    grid: { top: 25, right: 25, bottom: 25, left: 40 },
    tooltip: {},
    xAxis: {},
    yAxis: {},
    legend: {},
    series: [
      {
        type: 'scatter',
        encode: { tooltip: [0, 1] },
        symbolSize: 6,
        itemStyle: {
          color: hex2Rgba('#cfc', 0.5),
          borderColor: '#0af'
        },
        data: data.x.map((num: number, i: number) => {
          return [num, data.y[i]]
        })
      },
      {
        type: 'custom',
        renderItem: renderItem,
        clip: true,
        data: polygons,
      }
    ],
  });
}

onMounted(() => {
  d3Chart();
  echarts0();
  echarts1();
})
</script>

<template>
  <div class="container">
    <div class="chart-box">
      <div class="chart" ref="d3Dom" id="d3Chart"></div>
      <span>D3 置信椭圆</span>
    </div>
    <div class="chart-box">
      <div class="chart" ref="echarts0Dom"></div>
      <span>ECharts 置信椭圆</span>
    </div>
    <div class="chart-box">
      <div class="chart" ref="echarts1Dom"></div>
      <span>ECharts 多边形</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.container {
  width: 100%;
  display: flex;

  .chart-box {
    flex: 1;
    border: solid 1px #ececec;

    &:nth-child(2) {
      border-left: none;
      border-right: none;
    }

    .chart {
      width: 100%;
      height: 400px;
    }

    span {
      display: block;
      padding-top: 10px;
      padding-left: 25px;
      padding-bottom: 20px;
    }
  }
}
</style>
