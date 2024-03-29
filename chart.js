var margin = {top: 20, right: 20, bottom: 100, left: 50},
    margin2 = {top: 420, right: 20, bottom: 20, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom;

var parseDate = d3.timeParse("%d-%b-%y");

var parseDateComplete = d3.utcParse("%Y-%b-%d");

var x = techan.scale.financetime()
        .range([0, width]);

var x2 = techan.scale.financetime()
        .range([0, width]);

var y = d3.scaleLinear()
        .range([height, 0]);

var yVolume = d3.scaleLinear()
        .range([y(0), y(0.3)]);

var y2 = d3.scaleLinear()
        .range([height2, 0]);

var brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("end", brushed);

var candlestick = techan.plot.candlestick()
        .xScale(x)
        .yScale(y);

var ichimoku = techan.plot.ichimoku()
        .xScale(x)
        .yScale(y);

var tradearrow = techan.plot.tradearrow()
        .xScale(x)
        .yScale(y)
        .orient(function(d) { return d.type.startsWith("buy") ? "up" : "down"; })
        .on("mouseenter", enter)
        .on("mouseout", out);

var volume = techan.plot.volume()
        .xScale(x)
        .yScale(yVolume);

var close = techan.plot.close()
        .xScale(x2)
        .yScale(y2);

var xAxis = d3.axisBottom(x);
var xAxis2 = d3.axisBottom(x2);
var yAxis = d3.axisLeft(y);
var yAxis2 = d3.axisLeft(y2)
        .ticks(0);

var ohlcAnnotation = techan.plot.axisannotation()
        .axis(yAxis)
        .orient('left')
        .format(d3.format(',.2f'));

var timeAnnotation = techan.plot.axisannotation()
        .axis(xAxis)
        .orient('bottom')
        .format(d3.timeFormat('%Y-%m-%d'))
        .width(65)
        .translate([0, height]);

var crosshair = techan.plot.crosshair()
        .xScale(x)
        .yScale(y)
        .xAnnotation(timeAnnotation)
        .yAnnotation(ohlcAnnotation);

var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var valueText = focus.append('text')
        .style("text-anchor", "end")
        .attr("class", "coords")
        .attr("x", width - 5)
        .attr("y", 15);

focus.append("clipPath")
        .attr("id", "clip")
    .append("rect")
        .attr("x", 0)
        .attr("y", y(1))
        .attr("width", width)
        .attr("height", y(0) - y(1));

var ichimokuIndicator = techan.indicator.ichimoku();
// Don't show where indicators don't have data
var indicatorPreRoll = ichimokuIndicator.kijunSen()+ichimokuIndicator.senkouSpanB();

focus.append("g")
        .attr("class", "volume")
        .attr("clip-path", "url(#clip)");
focus.append("g")
        .attr("class", "candlestick")
        .attr("clip-path", "url(#clip)");
focus.append("g")
        .attr("class", "ichimoku")
        .attr("clip-path", "url(#clip)");
focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")");
focus.append("g")
        .attr("class", "y axis")
    .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price ($)");
focus.append('g')
        .attr("class", "crosshair")
        .call(crosshair);
var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");
context.append("g")
        .attr("class", "close");
context.append("g")
        .attr("class", "pane");
context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")");
context.append("g")
        .attr("class", "y axis")
        .call(yAxis2);
        
var fuuhistory;
//var trades;
//var recentTrade = 0;
//var recentDate = 0;

function cryptoChart(csvFile) {
    d3.csv(csvFile, function(error, data) {
        var accessor = candlestick.accessor(),
            timestart = Date.now();
        data = data.slice(0, 3500).map(function(d) {
            return {
                date: parseDateComplete(d.Date),
                open: +d.Open,
                high: +d.High,
                low: +d.Low,
                close: +d.Close,
                volume: +d.Volume
            };
        }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });
        fuuhistory = data;
        x.domain(data.map(accessor.d));
        x2.domain(x.domain());
        y.domain(techan.scale.plot.ohlc(data, accessor).domain());
        y2.domain(y.domain());
        yVolume.domain(techan.scale.plot.volume(data).domain());
        var ichimokuData = ichimokuIndicator(data);
        focus.select("g.ichimoku").datum(ichimokuData);
        //x.domain(data.map(ichimokuIndicator.accessor().d));
        // Calculate the y domain for visible data points (ensure to include Kijun Sen additional data offset)
        //y.domain(techan.scale.plot.ichimoku(ichimokuData.slice(indicatorPreRoll-ichimokuIndicator.kijunSen())).domain());
    
        focus.select("g.candlestick").datum(data);
        focus.select("g.volume").datum(data);
        context.select("g.close").datum(data).call(close);
        context.select("g.x.axis").call(xAxis2);
        // Associate the brush with the scale and render the brush only AFTER a domain has been applied
        context.select("g.pane").call(brush).selectAll("rect").attr("height", height2);
        x.zoomable().domain(x2.zoomable().domain());
        x.zoomable().clamp(false).domain([indicatorPreRoll, data.length+ichimokuIndicator.kijunSen()]);
        draw();
        console.log("Render time: " + (Date.now()-timestart));
    });
};

function cryptoTrades(csvFile) {
    d3.csv(csvFile, function(error, data) {
        console.log(data);
        data = data.map(function(x) {
         return {
           index: x["INDEX"],
           ticker: x["TICKER"],
           date: x["DATE"],
           price: +x["PRICE"],
           change24Hours: +x["HIGH-GAIN-24-HOURS"],
           change7Days: +x["HIGH-GAIN-7-DAYS"],
           change1Month: +x["HIGH-GAIN-1-MONTH"],
           change3Months: +x["HIGH-GAIN-3-MONTHS"],
           changeAllTime: +x["HIGH-GAIN-ALL-TIME"],
         }
        });
        console.log(data);

        d3.select("body").append("a").attr("href", "https://coinmarketcap.com/currencies/{{ticker}}").text("{{ticker}}");

        d3.select("body").append("table").attr("id", "fuu");
        var tr = d3.select("#fuu").append("tr");
        tr.append("th").text("Date");
        tr.append("th").text("Index");
        tr.append("th").text("Price ($)");
        tr.append("th").text("Gain (1 day)");
        tr.append("th").text("Gain (7 days)");
        tr.append("th").text("Gain (30 days)");
        tr.append("th").text("Gain (3 months)");
        tr.append("th").text("Gain (All Time)");

        data.map(function(x) { 
         var tr = d3.select("#fuu").append("tr")
         tr.append("td").text( x.date );
         tr.append("td").text( x.index );
         tr.append("td").text( x.price );

         tr.append("td").text( x.change24Hours.toFixed(2) );
         tr.append("td").text( x.change7Days.toFixed(2) );
         tr.append("td").text( x.change1Month.toFixed(2) );
         tr.append("td").text( x.change3Months.toFixed(2) );
         tr.append("td").text( x.changeAllTime.toFixed(2) );
        });
    });
}

function percentChange(x, y) {
    return x == 0 && y == 0 ? 0 : ((y - x) / x) * 100;
};

function brushed() {
    var zoomable = x.zoomable(),
        zoomable2 = x2.zoomable();
    zoomable.domain(zoomable2.domain());
    if(d3.event.selection !== null) zoomable.domain(d3.event.selection.map(zoomable.invert));
    draw();
}

function draw() {
    var candlestickSelection = focus.select("g.candlestick"),
        data = candlestickSelection.datum();
    y.domain(techan.scale.plot.ohlc(data.slice.apply(data, x.zoomable().domain()), candlestick.accessor()).domain());
    candlestickSelection.call(candlestick);
    focus.select("g.volume").call(volume);
    // using refresh method is more efficient as it does not perform any data joins
    // Use this if underlying data is not changing
//        svg.select("g.candlestick").call(candlestick.refresh);
    focus.select("g.ichimoku").call(ichimoku);
    focus.select("g.x.axis").call(xAxis);
    focus.select("g.y.axis").call(yAxis);
}

function enter(d) {
    valueText.style("display", "inline");
    refreshText(d);
}

function out() {
    valueText.style("display", "none");
}

function refreshText(d) {
    valueText.text("Trade: " + dateFormat(d.date) + ", " + d.type + ", " + valueFormat(d.price));
}
