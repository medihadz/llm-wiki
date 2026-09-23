(function () {
  createChart.registerRenderer('custom', function (g, config) {
    var c = createChart.components, u = createChart.utils;
    var data = config.data;
    var seriesConfig = config.seriesConfig;
    var axes = config.axes || {};
    var width = config._innerWidth;
    var height = config._innerHeight;

    var categories = data.map(function (d) { return d.category; });
    var keys = seriesConfig.map(function (s) { return s.key; });

    var colorFor = d3.scaleOrdinal()
      .domain(keys)
      .range(seriesConfig.map(function (s) { return s.color; }));

    // Fremdkapital renders as a solid lighter grey rather than the registered
    // #7E7E7E at reduced opacity: a semi-transparent fill lets the dashed
    // gridlines bleed through and read as drawn on top of the bar. The
    // declared seriesConfig color stays brand-registered for validation; only
    // the actual paint (and the matching legend dot below) uses the tint.
    var renderColor = function (key) {
      return key === 'fremdkapital' ? '#9F9E9E' : colorFor(key);
    };

    var stack = d3.stack()
      .keys(keys)
      .value(function (d, key) { return d[key] || 0; })
      .offset(d3.stackOffsetDiverging);

    var stackedData = stack(data);

    var xScale = d3.scaleBand().domain(categories).range([0, width]).padding(0.2);

    var maxValue = d3.max(stackedData, function (layer) {
      return d3.max(layer, function (d) { return d[1]; });
    });
    var minValue = d3.min(stackedData, function (layer) {
      return d3.min(layer, function (d) { return d[0]; });
    });

    var yScale = d3.scaleLinear()
      .domain([Math.min(0, minValue * 1.1), maxValue * 1.15])
      .range([height, 0])
      .nice();

    c.drawGrid(g, yScale, width, axes);
    c.drawBandXAxis(g, xScale, height, axes);
    var xAxisG = d3.select(g.node().lastChild);
    c.drawYAxis(g, yScale, axes);

    // The category axis's own domain line + tick marks sit right at the
    // plot bottom (the most negative value), a hair below the zero baseline
    // drawn further down — two near-overlapping black strokes read as one
    // messy, doubled line the labels seem to dangle from. Only the
    // intentional zero baseline should remain, so drop the axis's line and
    // ticks (scoped to the x-axis group only) and keep just the text.
    xAxisG.selectAll('.tick line').remove();
    xAxisG.select('.domain').remove();

    // Fully vertical year labels (drawBandXAxis's own "rotate" only tilts
    // -45°); override to -90° with end-anchored text so each label reads
    // bottom-to-top under its own bar.
    xAxisG.selectAll('.axis-label')
      .attr('transform', 'rotate(-90)')
      .style('text-anchor', 'end')
      .attr('dy', '0.32em');

    g.selectAll('.stacked-layer')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'stacked-layer')
      .attr('fill', function (d) { return renderColor(d.key); })
      .selectAll('rect')
      .data(function (d) { return d; })
      .enter()
      .append('rect')
      .attr('x', function (d) { return xScale(d.data.category); })
      .attr('y', function (d) { return yScale(Math.max(d[0], d[1])); })
      .attr('width', xScale.bandwidth())
      .attr('height', function (d) { return Math.abs(yScale(d[0]) - yScale(d[1])); });

    // Zero baseline, heavier than the helper grid.
    g.append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', config.corporate.colors.textPrimary)
      .attr('stroke-width', 1.5);

    // Total label above each bar: the positive stack height (the investment
    // volume for that year) — a returned equity share below zero is a
    // repayment, not part of the year's financing need, so it stays out of
    // the headline number the same way the source chart reads it.
    g.selectAll('.total-label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', function (d) { return xScale(d.category) + xScale.bandwidth() / 2; })
      .attr('y', function (d) {
        var posTotal = d.fremdkapital + d.innenfinanzierung + Math.max(d.eigenkapital, 0);
        return yScale(posTotal) - 10;
      })
      .attr('text-anchor', 'middle')
      .style('font-weight', '700')
      .style('font-size', '13px')
      .style('fill', config.corporate.colors.textPrimary)
      .text(function (d) {
        var posTotal = d.fremdkapital + d.innenfinanzierung + Math.max(d.eigenkapital, 0);
        return u.formatDE(Math.round(posTotal));
      });

    // Legend dots read the same lightened shade as the bars (a plain-opacity
    // rect can't do that on a dot, so the tint is pre-blended here instead).
    var legendItems = seriesConfig.map(function (s) {
      return s.key === 'fremdkapital' ? Object.assign({}, s, { color: '#9F9E9E' }) : s;
    });
    c.drawLegend(g, legendItems, config.legend, width, config);
  });
})();
