(function () {
  function roundedRectPath(x, y, w, h, r) {
    var tl = r.tl, tr = r.tr, br = r.br, bl = r.bl;
    return [
      'M', x + tl, y,
      'H', x + w - tr,
      'A', tr, tr, 0, 0, 1, x + w, y + tr,
      'V', y + h - br,
      'A', br, br, 0, 0, 1, x + w - br, y + h,
      'H', x + bl,
      'A', bl, bl, 0, 0, 1, x, y + h - bl,
      'V', y + tl,
      'A', tl, tl, 0, 0, 1, x + tl, y,
      'Z'
    ].join(' ');
  }

  createChart.registerRenderer('custom', function (g, config) {
    var raw = config.data;
    var axes = config.axes || {};
    var width = config._innerWidth;
    var height = config._innerHeight;

    var TOTAL_COLOR = '#81A1E3';
    var DELTA_COLOR = '#DABDAE';
    var HIGHLIGHT_COLOR = '#FF794D';

    var steps = [];
    var running = 0;
    raw.forEach(function (d) {
      if (d.kind === 'total') {
        running = d.value;
        steps.push({ category: d.category, value: d.value, start: 0, end: d.value, kind: 'total' });
      } else {
        var start = running;
        running += d.value;
        steps.push({
          category: d.category, value: d.value, start: start, end: running,
          kind: d.highlight ? 'highlight' : 'delta'
        });
      }
    });

    var categories = steps.map(function (d) { return d.category; });
    var xScale = d3.scaleBand().domain(categories).range([0, width]).padding(0.22);

    var allValues = [];
    steps.forEach(function (d) { allValues.push(d.start, d.end); });
    var yMax = d3.max(allValues);
    var yScale = d3.scaleLinear().domain([0, yMax * 1.15]).range([height, 0]).nice();

    createChart.components.drawGrid(g, yScale, width, axes);
    createChart.components.drawBandXAxis(g, xScale, height, axes);
    createChart.components.drawYAxis(g, yScale, axes);

    var r = 7;
    g.selectAll('.wf-bar')
      .data(steps)
      .enter()
      .append('path')
      .attr('d', function (d) {
        var x = xScale(d.category);
        var w = xScale.bandwidth();
        var topY = yScale(Math.max(d.start, d.end));
        var h = Math.abs(yScale(d.start) - yScale(d.end));
        var radii = d.kind === 'total'
          ? { tl: r, tr: r, br: 0, bl: 0 }
          : { tl: r, tr: r, br: r, bl: r };
        return roundedRectPath(x, topY, w, h, radii);
      })
      .attr('fill', function (d) {
        if (d.kind === 'total') return TOTAL_COLOR;
        if (d.kind === 'highlight') return HIGHLIGHT_COLOR;
        return DELTA_COLOR;
      });

    // Dashed connector between the end of one bar and the top of the next.
    for (var i = 0; i < steps.length - 1; i++) {
      var a = steps[i], b = steps[i + 1];
      g.append('line')
        .attr('x1', xScale(a.category) + xScale.bandwidth())
        .attr('x2', xScale(b.category))
        .attr('y1', yScale(a.end))
        .attr('y2', yScale(a.end))
        .attr('stroke', config.corporate.colors.textPrimary)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    }

    // Value labels above every bar.
    g.selectAll('.wf-label')
      .data(steps)
      .enter()
      .append('text')
      .attr('x', function (d) { return xScale(d.category) + xScale.bandwidth() / 2; })
      .attr('y', function (d) { return yScale(Math.max(d.start, d.end)) - 10; })
      .attr('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('fill', config.corporate.colors.textPrimary)
      .text(function (d) {
        var v = createChart.utils.formatDE(d.value);
        return d.kind === 'total' ? v : (d.value >= 0 ? '+' + v : v);
      });

    // Bracket annotation: from the top of the mid subtotal over to the
    // final total, with an arrow pointing down into it — calling out that
    // the steps in between halve the subtotal before it.
    var subtotal = steps.filter(function (d) { return d.kind === 'total'; })[1];
    var final = steps[steps.length - 1];
    if (subtotal && final) {
      var x0 = xScale(subtotal.category) + xScale.bandwidth() / 2;
      var y0 = yScale(subtotal.end) - 26;
      var x1 = xScale(final.category) + xScale.bandwidth() / 2;
      var yTop = Math.min(y0, yScale(final.end) - 26) - 14;
      var bracket = g.append('g');
      bracket.append('path')
        .attr('d', 'M ' + x0 + ' ' + y0 + ' V ' + yTop + ' H ' + x1 + ' V ' + (yScale(final.end) - 40))
        .attr('fill', 'none')
        .attr('stroke', HIGHLIGHT_COLOR)
        .attr('stroke-width', 2);
      bracket.append('path')
        .attr('d', 'M ' + (x1 - 5) + ' ' + (yScale(final.end) - 46) +
          ' L ' + x1 + ' ' + (yScale(final.end) - 36) +
          ' L ' + (x1 + 5) + ' ' + (yScale(final.end) - 46))
        .attr('fill', 'none')
        .attr('stroke', HIGHLIGHT_COLOR)
        .attr('stroke-width', 2);
      bracket.append('rect')
        .attr('x', (x0 + x1) / 2 - 34)
        .attr('y', yTop - 11)
        .attr('width', 68)
        .attr('height', 22)
        .attr('rx', 11)
        .attr('fill', '#fff')
        .attr('stroke', HIGHLIGHT_COLOR)
        .attr('stroke-width', 2);
      bracket.append('text')
        .attr('x', (x0 + x1) / 2)
        .attr('y', yTop + 4)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('fill', HIGHLIGHT_COLOR)
        .text('-50%');
    }
  });
})();
