const QuickChart = require('quickchart-js');

const myChart = new QuickChart();
myChart
  .setConfig({
    type: 'bar',
    data: { labels: ['Enero', 'Febrero'], datasets: [{ label: 'Gasto total', data: [10, 25] }] },
  })
  .setWidth(800)
  .setHeight(400)
  .setBackgroundColor('transparent');

// Make the bot return this URl as src for image
console.log(myChart.getUrl());