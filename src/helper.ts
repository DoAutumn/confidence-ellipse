import * as echarts from 'echarts'
import * as d3 from 'd3'
import * as jStat from 'jstat'
// import * as numeric from 'numeric'
declare const numeric: any

// echarts 自定义椭圆形状
// 这部分代码来源于 zrender 的 Ellipse 形状
const Ellipse = echarts.graphic.extendShape({
  shape: {
    cx: 0, cy: 0,
    rx: 0, ry: 0,
  },
  buildPath: function (ctx: any, shape) {
    var k = 0.5522848;
    var x = shape.cx;
    var y = shape.cy;
    var a = shape.rx;
    var b = shape.ry;
    var ox = a * k; // 水平控制点偏移量
    var oy = b * k; // 垂直控制点偏移量
    ctx.moveTo(x - a, y);
    ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
    ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
    ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
    ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
    ctx.closePath();
  }
});
echarts.graphic.registerShape('ellipse', Ellipse);




/**
 * 十六进制颜色转换为rgba格式
 * @param color 十六进制颜色
 * @param alpha 透明度
 * @param rgbaNum 是否返回数值形式的数组，默认false
 * @returns 
 */
export const hex2Rgba = (color: string, alpha: number, rgbaNum = false) => {
  let reg = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (!color || !reg.test(color)) return color;
  if (!alpha && alpha !== 0) alpha = 1;
  if (color.length === 4) {
    let _c = '#';
    for (let i = 1; i < 4; i++) {
      _c += color.slice(i, i + 1).concat(color.slice(i, i + 1));
    }
    color = _c;
  }
  let _cArr = [];
  for (let i = 1; i < 7; i += 2) {
    _cArr.push(parseInt('0x' + color.slice(i, i + 2)));
  }
  return rgbaNum ? _cArr : `rgba(${_cArr.join(',')}, ${alpha})`;
}





/**
 * 凸包算法
 * https://baike.baidu.com/item/%E5%87%B8%E5%8C%85/179150
 */
export const convalHull = (arr: Point[]): Point[] => {
  const nArr = [], len = arr.length;

  let i = 0, j = 0, s = 0, t = 0, min = Number.MAX_VALUE;

  arr.map((p, index) => {
    p.y < min && (min = p.y) && (i = index);
  });

  j = i;
  do {
    nArr.push(arr[j]);
    s = -1;
    for (t = 0; t < len; t++) {
      if (t != j && t != s && (s == -1 || !toLeft(arr[j], arr[s], arr[t]))) {
        s = t;
      };
    };
    j = s;
    nArr.push(arr[j]);
  } while (i != j && nArr.length <= arr.length);

  if (nArr.length > arr.length) {
    nArr.length = arr.length;
  }

  return nArr;
}

interface Point {
  x: number;
  y: number;
}

const toLeft = (p: Point, q: Point, s: Point): boolean => {
  return p.x * q.y - p.y * q.x + q.x * s.y - q.y * s.x + s.x * p.y - s.y * p.x > 0;
}





/**
 * 计算一组数据集的置信椭圆，包括中心坐标、长轴、短轴、旋转角度
 * level表示置信度，默认0.95
 */
export const confidenceEllipse = (data: Data, level = 0.95) => {
  const xData = data.x,
    xDataDev = d3.deviation(xData) || 1,
    xMean = d3.mean(xData) || 1,

    yData = data.y,
    yDataDev = d3.deviation(yData) || 1,
    yMean = d3.mean(yData) || 1,

    cor = jStat.corrcoeff(xData, yData),
    cov = cor * xDataDev * yDataDev,
    covmat = [[xDataDev * xDataDev, cov], [cov, yDataDev * yDataDev]],
    eig = numeric.eig(covmat),
    scale = Math.sqrt(jStat.chisquare.inv(level, 2)),
    maxLambdaI = eig.lambda.x.findIndex((a: number) => a === Math.max(...eig.lambda.x)),
    minLambdaI = eig.lambda.x.findIndex((a: number) => a === Math.min(...eig.lambda.x)),
    rx = xDataDev > yDataDev ? Math.sqrt(eig.lambda.x[maxLambdaI]) * scale : Math.sqrt(eig.lambda.x[minLambdaI]) * scale,
    ry = yDataDev > xDataDev ? Math.sqrt(eig.lambda.x[maxLambdaI]) * scale : Math.sqrt(eig.lambda.x[minLambdaI]) * scale,
    v1 = eig.E.x[maxLambdaI];

  let theta = Math.atan2(v1[1], v1[0]);
  if (theta < 0) {
    theta += 2 * Math.PI;
  }

  // make the ellipse object
  return {
    rx: rx,
    ry: ry,
    cx: xMean,
    cy: yMean,
    orient: -(theta * 180 / Math.PI),
    orientForECharts: theta
  };
}

interface Data {
  x: number[],
  y: number[],
}