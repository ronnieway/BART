//- inject:parts
/*! BigText - v0.1.7a - 2014-07-18
 * https://github.com/zachleat/bigtext
 * Copyright (c) 2014 Zach Leatherman (@zachleat)
 * MIT License */

(function (window, $) {
  "use strict";

  var counter = 0,
      $headCache = $('head'),
      oldBigText = window.BigText,
      oldjQueryMethod = $.fn.bigtext,
      BigText = {
    DEBUG_MODE: false,
    DEFAULT_MIN_FONT_SIZE_PX: null,
    DEFAULT_MAX_FONT_SIZE_PX: 528,
    GLOBAL_STYLE_ID: 'bigtext-style',
    STYLE_ID: 'bigtext-id',
    LINE_CLASS_PREFIX: 'bigtext-line',
    EXEMPT_CLASS: 'bigtext-exempt',
    noConflict: function (restore) {
      if (restore) {
        $.fn.bigtext = oldjQueryMethod;
        window.BigText = oldBigText;
      }
      return BigText;
    },
    test: {
      wholeNumberFontSizeOnly: function () {
        if (!('getComputedStyle' in window) || document.body == null) {
          return true;
        }
        var test = $('<div/>').css({
          position: 'absolute',
          'font-size': '14.1px'
        }).appendTo(document.body).get(0),
            computedStyle = window.getComputedStyle(test, null);

        if (computedStyle) {
          return computedStyle.getPropertyValue('font-size') === '14px';
        }
        return true;
      }
    },
    supports: {
      wholeNumberFontSizeOnly: undefined
    },
    init: function () {
      if (BigText.supports.wholeNumberFontSizeOnly === undefined) {
        BigText.supports.wholeNumberFontSizeOnly = BigText.test.wholeNumberFontSizeOnly();
      }

      if (!$('#' + BigText.GLOBAL_STYLE_ID).length) {
        $headCache.append(BigText.generateStyleTag(BigText.GLOBAL_STYLE_ID, ['.bigtext * { white-space: nowrap; } .bigtext > * { display: block; }', '.bigtext .' + BigText.EXEMPT_CLASS + ', .bigtext .' + BigText.EXEMPT_CLASS + ' * { white-space: normal; }']));
      }
    },
    bindResize: function (eventName, resizeFunction) {
      if ($.throttle) {
        // https://github.com/cowboy/jquery-throttle-debounce
        $(window).unbind(eventName).bind(eventName, $.throttle(100, resizeFunction));
      } else {
        if ($.fn.smartresize) {
          // https://github.com/lrbabe/jquery-smartresize/
          eventName = 'smartresize.' + eventName;
        }
        $(window).unbind(eventName).bind(eventName, resizeFunction);
      }
    },
    getStyleId: function (id) {
      return BigText.STYLE_ID + '-' + id;
    },
    generateStyleTag: function (id, css) {
      return $('<style>' + css.join('\n') + '</style>').attr('id', id);
    },
    clearCss: function (id) {
      var styleId = BigText.getStyleId(id);
      $('#' + styleId).remove();
    },
    generateCss: function (id, linesFontSizes, lineWordSpacings, minFontSizes) {
      var css = [];

      BigText.clearCss(id);

      for (var j = 0, k = linesFontSizes.length; j < k; j++) {
        css.push('#' + id + ' .' + BigText.LINE_CLASS_PREFIX + j + ' {' + (minFontSizes[j] ? ' white-space: normal;' : '') + (linesFontSizes[j] ? ' font-size: ' + linesFontSizes[j] + 'px;' : '') + (lineWordSpacings[j] ? ' word-spacing: ' + lineWordSpacings[j] + 'px;' : '') + '}');
      }

      return BigText.generateStyleTag(BigText.getStyleId(id), css);
    },
    jQueryMethod: function (options) {
      BigText.init();

      options = $.extend({
        minfontsize: BigText.DEFAULT_MIN_FONT_SIZE_PX,
        maxfontsize: BigText.DEFAULT_MAX_FONT_SIZE_PX,
        childSelector: '',
        resize: true
      }, options || {});

      this.each(function () {
        var $t = $(this).addClass('bigtext'),
            maxWidth = $t.width(),
            id = $t.attr('id'),
            $children = options.childSelector ? $t.find(options.childSelector) : $t.children();

        if (!id) {
          id = 'bigtext-id' + counter++;
          $t.attr('id', id);
        }

        if (options.resize) {
          BigText.bindResize('resize.bigtext-event-' + id, function () {
            // TODO only call this if the width has changed.
            BigText.jQueryMethod.call($('#' + id), options);
          });
        }

        BigText.clearCss(id);

        $children.addClass(function (lineNumber, className) {
          // remove existing line classes.
          return [className.replace(new RegExp('\\b' + BigText.LINE_CLASS_PREFIX + '\\d+\\b'), ''), BigText.LINE_CLASS_PREFIX + lineNumber].join(' ');
        });

        var sizes = calculateSizes($t, $children, maxWidth, options.maxfontsize, options.minfontsize);
        $headCache.append(BigText.generateCss(id, sizes.fontSizes, sizes.wordSpacings, sizes.minFontSizes));
      });

      return this.trigger('bigtext:complete');
    }
  };

  function testLineDimensions($line, maxWidth, property, size, interval, units, previousWidth) {
    var width;
    previousWidth = typeof previousWidth === 'number' ? previousWidth : 0;
    $line.css(property, size + units);

    width = $line.width();

    if (width >= maxWidth) {
      // console.log(width, ' previous: ' + previousWidth, property + ' at ' + interval, 'prior: ' + (parseFloat(size) - interval), 'new:' + parseFloat(size));
      $line.css(property, '');

      if (width === maxWidth) {
        return {
          match: 'exact',
          size: parseFloat((parseFloat(size) - 0.1).toFixed(3))
        };
      }

      // Since this is an estimate, we calculate how far over the width we went with the new value.
      // If this is word-spacing (our last resort guess) and the over is less than the under, we keep the higher value.
      // Otherwise, we revert to the underestimate.
      var under = maxWidth - previousWidth,
          over = width - maxWidth;

      return {
        match: 'estimate',
        size: parseFloat((parseFloat(size) - (property === 'word-spacing' && previousWidth && over < under ? 0 : interval)).toFixed(3))
      };
    }

    return width;
  }

  function calculateSizes($t, $children, maxWidth, maxFontSize, minFontSize) {
    var $c = $t.clone(true).addClass('bigtext-cloned').css({
      fontFamily: $t.css('font-family'),
      textTransform: $t.css('text-transform'),
      wordSpacing: $t.css('word-spacing'),
      letterSpacing: $t.css('letter-spacing'),
      position: 'absolute',
      left: BigText.DEBUG_MODE ? 0 : -9999,
      top: BigText.DEBUG_MODE ? 0 : -9999
    }).appendTo(document.body);

    // font-size isn't the only thing we can modify, we can also mess with:
    // word-spacing and letter-spacing. WebKit does not respect subpixel
    // letter-spacing, word-spacing, or font-size.
    // TODO try -webkit-transform: scale() as a workaround.
    var fontSizes = [],
        wordSpacings = [],
        minFontSizes = [],
        ratios = [];

    $children.css('float', 'left').each(function () {
      var $line = $(this),

      // TODO replace 8, 4 with a proportional size to the calculated font-size.
      intervals = BigText.supports.wholeNumberFontSizeOnly ? [8, 4, 1] : [8, 4, 1, 0.1],
          lineMax,
          newFontSize;

      if ($line.hasClass(BigText.EXEMPT_CLASS)) {
        fontSizes.push(null);
        ratios.push(null);
        minFontSizes.push(false);
        return;
      }

      // TODO we can cache this ratio?
      var autoGuessSubtraction = 32,
          // font size in px
      currentFontSize = parseFloat($line.css('font-size')),
          ratio = ($line.width() / currentFontSize).toFixed(6);

      newFontSize = parseInt(maxWidth / ratio, 10) - autoGuessSubtraction;

      outer: for (var m = 0, n = intervals.length; m < n; m++) {
        inner: for (var j = 1, k = 10; j <= k; j++) {
          if (newFontSize + j * intervals[m] > maxFontSize) {
            newFontSize = maxFontSize;
            break outer;
          }

          lineMax = testLineDimensions($line, maxWidth, 'font-size', newFontSize + j * intervals[m], intervals[m], 'px', lineMax);
          if (typeof lineMax !== 'number') {
            newFontSize = lineMax.size;

            if (lineMax.match === 'exact') {
              break outer;
            }
            break inner;
          }
        }
      }

      ratios.push(maxWidth / newFontSize);

      if (newFontSize > maxFontSize) {
        fontSizes.push(maxFontSize);
        minFontSizes.push(false);
      } else if (!!minFontSize && newFontSize < minFontSize) {
        fontSizes.push(minFontSize);
        minFontSizes.push(true);
      } else {
        fontSizes.push(newFontSize);
        minFontSizes.push(false);
      }
    }).each(function (lineNumber) {
      var $line = $(this),
          wordSpacing = 0,
          interval = 1,
          maxWordSpacing;

      if ($line.hasClass(BigText.EXEMPT_CLASS)) {
        wordSpacings.push(null);
        return;
      }

      // must re-use font-size, even though it was removed above.
      $line.css('font-size', fontSizes[lineNumber] + 'px');

      for (var m = 1, n = 3; m < n; m += interval) {
        maxWordSpacing = testLineDimensions($line, maxWidth, 'word-spacing', m, interval, 'px', maxWordSpacing);
        if (typeof maxWordSpacing !== 'number') {
          wordSpacing = maxWordSpacing.size;
          break;
        }
      }

      $line.css('font-size', '');
      wordSpacings.push(wordSpacing);
    }).removeAttr('style');

    if (!BigText.DEBUG_MODE) {
      $c.remove();
    } else {
      $c.css({
        'background-color': 'rgba(255,255,255,.4)'
      });
    }

    return {
      fontSizes: fontSizes,
      wordSpacings: wordSpacings,
      ratios: ratios,
      minFontSizes: minFontSizes
    };
  }

  $.fn.bigtext = BigText.jQueryMethod;
  window.BigText = BigText;
})(this, jQuery);

$('#bigtext').bigtext();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/swGetData.js').then(function (registration) {
    console.log('ServiceWorker registration', registration);
  }).catch(function (err) {
    throw new Error('ServiceWorker error: ' + err);
  });
}

function loadData() {
  let wurl = 'http://api.bart.gov/api/stn.aspx?cmd=stns&key=MW9S-E7SL-26DU-VV8V';
  $.ajax({
    type: "GET",
    url: wurl,
    dataType: "xml",
    success: parseXml,
    error: function () {
      $("#routes-at-station-header").css('color', 'red').html("You are offline!");
      $("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
    }
  });

  function parseXml(xml) {
    $("#stations-list").html("");
    $(xml).find("station").each(function () {
      $("#stations-list").append("<option value='" + $(this).find("name").text() + "' data-value='" + $(this).find("abbr").text() + "'></option>");
      $("#stations-list2").append("<option value='" + $(this).find("name").text() + "' data-value='" + $(this).find("abbr").text() + "'></option>");
    });
  }
  return false;
}

function chooseStation() {
  let chosen = $("#stations-input").val();
  let currentStation = $("#stations-list option[value='" + chosen + "']").attr('data-value');
  let wurl = 'http://api.bart.gov/api/stn.aspx?cmd=stninfo&key=MW9S-E7SL-26DU-VV8V&orig=' + currentStation;
  $.ajax({
    type: "GET",
    url: wurl,
    dataType: "xml",
    success: function (data) {
      return data;
    },
    complete: parseXml2,
    error: function () {
      $("#routes-at-station-header").css('color', 'red').html("You are offline!");
      $("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
      $("#all-schedule-content").html("");
    }
  });

  function parseXml2(xml) {
    $("#form-container2").css('display', 'block');
    $("#routes-at-station-values").html("");
    $("#routes-at-station-header").html("<p>Choose route</p>");
    $("#stations-input2").val("");
    $("#all-schedule-content").html("");
    $("#sched-results").html("");
    let a = $(xml.responseText).find("station").find("north_routes").find("route").text();
    let b = $(xml.responseText).find("station").find("south_routes").find("route").text();
    a = a.replace(/\s/g, '');
    b = b.replace(/\s/g, '');
    let nRoutes = a.split("ROUTE").slice(2);
    let sRoutes = b.split("ROUTE").slice(2);
    $("#routes-at-station-header").html("Routes at the station");
    for (let i = 0; i < nRoutes.length; i++) {
      $("#routes-at-station-values").append("<div class='col-xs-10 col-sm-10 col-md-5 col-lg-5' id='route" + nRoutes[i] + "'><b><a onclick='chooseRoute(" + nRoutes[i] + ");'>Route " + nRoutes[i] + "</a></b></div>");
    }
    for (let j = 0; j < sRoutes.length; j++) {
      $("#routes-at-station-values").append("<div class='col-xs-10 col-sm-10 col-md-5 col-lg-5' id='route" + sRoutes[j] + "'><b><a onclick='chooseRoute(" + sRoutes[j] + ");'>Route " + sRoutes[j] + "</a></b></div>");
    }
  }

  $.ajax({
    type: "GET",
    url: "http://api.bart.gov/api/sched.aspx?cmd=stnsched&key=MW9S-E7SL-26DU-VV8V&l=1&orig=" + currentStation,
    dataType: "xml",
    success: $("#all-schedule-link").html("<button type='button' class='btn btn-primary btn-lg btn-block' id='offline-sched'>Offline schedule for " + chosen + "</button>"),
    error: function () {
      $("#routes-at-station-header").css('color', 'red').html("You are offline!");
      $("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
      $("#all-schedule-content").html("");
    }
  });
  return false;
}

function chooseRoute(x) {
  let wurl = 'http://api.bart.gov/api/route.aspx?cmd=routeinfo&key=MW9S-E7SL-26DU-VV8V&route=' + x;
  $.ajax({
    type: "GET",
    url: wurl,
    dataType: "xml",
    success: parseXml3,
    error: function () {
      $("#routes-at-station-header").css('color', 'red').html("You are offline!");
      $("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
      $("#all-schedule-content").html("");
    }
  });

  function parseXml3(xml) {
    $("#routes-at-station-header").html("<p>Select the destination at the chosen route</p>");
    let b = "#route" + x;
    let a = $(xml).find("station").text();
    a = a.match(/.{4}/g);
    $("#all-schedule-content").html("");
    let chosen = $("#stations-input").val();
    for (let i = 0; i < a.length; i++) {
      let onclick = "finalDestination('" + a[i] + "')";
      if ($("#stations-list option[data-value='" + a[i] + "']").attr('value') != undefined) {
        if (a[i] == $("#stations-list option[value='" + chosen + "']").attr('data-value')) {
          $(b).append("<p class='you-are-here'> You are here: " + $("#stations-list option[data-value='" + a[i] + "']").attr('value') + "</p>");
        } else {
          $(b).append("<p><a onclick=" + onclick + ";>" + $("#stations-list option[data-value='" + a[i] + "']").attr('value') + "</a></p>");
        }
      }
    }
  }
  return false;
}

function finalDestination(xx) {
  let chosen = $("#stations-input").val();
  let org = $("#stations-list option[value='" + chosen + "']").attr('data-value');
  let wurl = 'http://api.bart.gov/api/sched.aspx?cmd=arrive&date=now&key=MW9S-E7SL-26DU-VV8V&b=0&a=3&orig=' + org + '&dest=' + xx;
  $.ajax({
    type: "GET",
    url: wurl,
    dataType: "xml",
    success: parseXml4,
    error: function () {
      $("#routes-at-station-header").css('color', 'red').html("You are offline!");
      $("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
      $("#all-schedule-content").html("");
    }
  });

  function parseXml4(xml) {
    $("#sched-results").html("");
    $("#all-schedule-content").html("");
    $("#routes-at-station-values").html("");
    $("#routes-at-station-header").html("");
    $("#sched-results").append("<h4 class='suggestedTime'>You can pick one of the following trains to " + $("#stations-list option[data-value='" + xx + "']").attr('value') + "</h4>");
    $(xml).find("trip").each(function () {
      let depTimeArr = this.children[1].outerHTML.split("origTimeMin=");
      let depTime = depTimeArr[1].slice(1, 9);
      let arrTimeArr = this.children[1].outerHTML.split("destTimeMin=");
      let arrTime = arrTimeArr[1].slice(1, 9);
      if (depTime[7] == '"') {
        depTime = depTime.slice(0, -1);
      }
      if (arrTime[7] == '"') {
        arrTime = arrTime.slice(0, -1);
      }
      $("#sched-results").append("<p class='suggestedTime'>Departure: " + depTime + ", arrival: " + arrTime + "</p>");
    });
  }
  return false;
}

function finalDestination2() {
  let chosen = $("#stations-input").val();
  let org = $("#stations-list option[value='" + chosen + "']").attr('data-value');
  let chosen2 = $("#stations-input2").val();
  let dst = $("#stations-list2 option[value='" + chosen2 + "']").attr('data-value');
  let wurl = 'http://api.bart.gov/api/sched.aspx?cmd=arrive&date=now&key=MW9S-E7SL-26DU-VV8V&b=0&a=3&orig=' + org + '&dest=' + dst;
  $.ajax({
    type: "GET",
    url: wurl,
    dataType: "xml",
    success: parseXml5,
    error: function () {
      $("#routes-at-station-header").css('color', 'red').html("You are offline!");
      $("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
      $("#all-schedule-content").html("");
    }
  });

  function parseXml5(xml) {
    let xx = $("#stations-input2").val();
    $("#sched-results").html("");
    $("#all-schedule-content").html("");
    $("#routes-at-station-values").html("");
    $("#routes-at-station-header").html("");
    $("#sched-results").append("<h4 class='suggestedTime'>You can pick one of the following trains to " + xx + "</h4>");
    $(xml).find("trip").each(function () {
      let depTimeArr = this.children[1].outerHTML.split("origTimeMin=");
      let depTime = depTimeArr[1].slice(1, 9);
      let arrTimeArr = this.children[1].outerHTML.split("destTimeMin=");
      let arrTime = arrTimeArr[1].slice(1, 9);
      if (depTime[7] == '"') {
        depTime = depTime.slice(0, -1);
      }
      if (arrTime[7] == '"') {
        arrTime = arrTime.slice(0, -1);
      }
      $("#sched-results").append("<p class='suggestedTime'>Departure: " + depTime + ", arrival: " + arrTime + "</p>");
    });
  }
  return false;
}

function showSchedule() {
  let chosen = $("#stations-input").val();
  let currentStation = $("#stations-list option[value='" + chosen + "']").attr('data-value');
  let currentStationVal = $("#stations-list option[value='" + chosen + "']").attr('value');
  $.ajax({
    type: "GET",
    url: "http://api.bart.gov/api/sched.aspx?cmd=stnsched&key=MW9S-E7SL-26DU-VV8V&l=1&orig=" + currentStation,
    dataType: "xml",
    success: parseSched,
    error: function () {
      $("#routes-at-station-header").css('color', 'red').html("You are offline!");
      $("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
      $("#all-schedule-content").html("");
    }
  });
  function parseSched(xml) {
    $("#routes-at-station-header").html("");
    $("#routes-at-station-values").html("");
    $("#all-schedule-content").html("");
    $("#sched-results").html("");
    let chosen = $("#stations-input").val();
    let currentStation = $("#stations-list option[value='" + chosen + "']").attr('data-value');
    $("#all-schedule-link").html("<button type='button' class='btn btn-primary btn-lg btn-block' id='offline-sched'>Offline schedule for " + currentStationVal + "</button>");
    let theList = xml.children[0].innerHTML;
    theList = theList.split("<item line=").slice(1);
    let myBigTable = "<table class='table table-hover table-responsive table-striped' id='sched-table'><thead class='center'><tr class='row'><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Route</th><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Destination</th><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Departure time</th><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Arrival time</th></tr></thead><tbody>";
    for (let h = 0; h < theList.length; h++) {
      let columnRoute = theList[h].slice(1, 9);
      if (columnRoute[7] == '"') {
        columnRoute = columnRoute.slice(0, -1);
      }
      let columnDestArr = theList[h].split("trainHeadStation=");
      let columnDestAbr = columnDestArr[1].slice(1, 5);
      let columnDest = $("#stations-list option[data-value='" + columnDestAbr + "']").attr('value');
      let columnStartDepArr = theList[h].split("origTime=");
      let columnStartDep = columnStartDepArr[1].slice(1, 9);
      if (columnStartDep[7] == '"') {
        columnStartDep = columnStartDep.slice(0, -1);
      }
      let columnFinalArrArr = theList[h].split("destTime=");
      let columnFinalArr = columnFinalArrArr[1].slice(1, 9);
      if (columnFinalArr[7] == '"') {
        columnFinalArr = columnFinalArr.slice(0, -1);
      }
      myBigTable = myBigTable + "<tr class='row'><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnRoute + "</td><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnDest + "</td><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnStartDep + "</td><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnFinalArr + "</td></tr>";
    }
    myBigTable = myBigTable + "</tbody></table>";
    $("#all-schedule-content").append(myBigTable);
  }
}

$('#form-container').submit(chooseStation);
$('#form-container2').submit(finalDestination2);
$('#all-schedule-link').click(showSchedule);
//- endinject
//- inject:plugins

//- endinject
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vLSBpbmplY3Q6cGFydHNcbi8qISBCaWdUZXh0IC0gdjAuMS43YSAtIDIwMTQtMDctMThcclxuICogaHR0cHM6Ly9naXRodWIuY29tL3phY2hsZWF0L2JpZ3RleHRcclxuICogQ29weXJpZ2h0IChjKSAyMDE0IFphY2ggTGVhdGhlcm1hbiAoQHphY2hsZWF0KVxyXG4gKiBNSVQgTGljZW5zZSAqL1xuXG4oZnVuY3Rpb24gKHdpbmRvdywgJCkge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgY291bnRlciA9IDAsXG4gICAgICAkaGVhZENhY2hlID0gJCgnaGVhZCcpLFxuICAgICAgb2xkQmlnVGV4dCA9IHdpbmRvdy5CaWdUZXh0LFxuICAgICAgb2xkalF1ZXJ5TWV0aG9kID0gJC5mbi5iaWd0ZXh0LFxuICAgICAgQmlnVGV4dCA9IHtcbiAgICBERUJVR19NT0RFOiBmYWxzZSxcbiAgICBERUZBVUxUX01JTl9GT05UX1NJWkVfUFg6IG51bGwsXG4gICAgREVGQVVMVF9NQVhfRk9OVF9TSVpFX1BYOiA1MjgsXG4gICAgR0xPQkFMX1NUWUxFX0lEOiAnYmlndGV4dC1zdHlsZScsXG4gICAgU1RZTEVfSUQ6ICdiaWd0ZXh0LWlkJyxcbiAgICBMSU5FX0NMQVNTX1BSRUZJWDogJ2JpZ3RleHQtbGluZScsXG4gICAgRVhFTVBUX0NMQVNTOiAnYmlndGV4dC1leGVtcHQnLFxuICAgIG5vQ29uZmxpY3Q6IGZ1bmN0aW9uIChyZXN0b3JlKSB7XG4gICAgICBpZiAocmVzdG9yZSkge1xuICAgICAgICAkLmZuLmJpZ3RleHQgPSBvbGRqUXVlcnlNZXRob2Q7XG4gICAgICAgIHdpbmRvdy5CaWdUZXh0ID0gb2xkQmlnVGV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBCaWdUZXh0O1xuICAgIH0sXG4gICAgdGVzdDoge1xuICAgICAgd2hvbGVOdW1iZXJGb250U2l6ZU9ubHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCEoJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdykgfHwgZG9jdW1lbnQuYm9keSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRlc3QgPSAkKCc8ZGl2Lz4nKS5jc3Moe1xuICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgICAgICdmb250LXNpemUnOiAnMTQuMXB4J1xuICAgICAgICB9KS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KS5nZXQoMCksXG4gICAgICAgICAgICBjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGVzdCwgbnVsbCk7XG5cbiAgICAgICAgaWYgKGNvbXB1dGVkU3R5bGUpIHtcbiAgICAgICAgICByZXR1cm4gY29tcHV0ZWRTdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdmb250LXNpemUnKSA9PT0gJzE0cHgnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0sXG4gICAgc3VwcG9ydHM6IHtcbiAgICAgIHdob2xlTnVtYmVyRm9udFNpemVPbmx5OiB1bmRlZmluZWRcbiAgICB9LFxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChCaWdUZXh0LnN1cHBvcnRzLndob2xlTnVtYmVyRm9udFNpemVPbmx5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgQmlnVGV4dC5zdXBwb3J0cy53aG9sZU51bWJlckZvbnRTaXplT25seSA9IEJpZ1RleHQudGVzdC53aG9sZU51bWJlckZvbnRTaXplT25seSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoISQoJyMnICsgQmlnVGV4dC5HTE9CQUxfU1RZTEVfSUQpLmxlbmd0aCkge1xuICAgICAgICAkaGVhZENhY2hlLmFwcGVuZChCaWdUZXh0LmdlbmVyYXRlU3R5bGVUYWcoQmlnVGV4dC5HTE9CQUxfU1RZTEVfSUQsIFsnLmJpZ3RleHQgKiB7IHdoaXRlLXNwYWNlOiBub3dyYXA7IH0gLmJpZ3RleHQgPiAqIHsgZGlzcGxheTogYmxvY2s7IH0nLCAnLmJpZ3RleHQgLicgKyBCaWdUZXh0LkVYRU1QVF9DTEFTUyArICcsIC5iaWd0ZXh0IC4nICsgQmlnVGV4dC5FWEVNUFRfQ0xBU1MgKyAnICogeyB3aGl0ZS1zcGFjZTogbm9ybWFsOyB9J10pKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGJpbmRSZXNpemU6IGZ1bmN0aW9uIChldmVudE5hbWUsIHJlc2l6ZUZ1bmN0aW9uKSB7XG4gICAgICBpZiAoJC50aHJvdHRsZSkge1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vY293Ym95L2pxdWVyeS10aHJvdHRsZS1kZWJvdW5jZVxuICAgICAgICAkKHdpbmRvdykudW5iaW5kKGV2ZW50TmFtZSkuYmluZChldmVudE5hbWUsICQudGhyb3R0bGUoMTAwLCByZXNpemVGdW5jdGlvbikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCQuZm4uc21hcnRyZXNpemUpIHtcbiAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbHJiYWJlL2pxdWVyeS1zbWFydHJlc2l6ZS9cbiAgICAgICAgICBldmVudE5hbWUgPSAnc21hcnRyZXNpemUuJyArIGV2ZW50TmFtZTtcbiAgICAgICAgfVxuICAgICAgICAkKHdpbmRvdykudW5iaW5kKGV2ZW50TmFtZSkuYmluZChldmVudE5hbWUsIHJlc2l6ZUZ1bmN0aW9uKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGdldFN0eWxlSWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuIEJpZ1RleHQuU1RZTEVfSUQgKyAnLScgKyBpZDtcbiAgICB9LFxuICAgIGdlbmVyYXRlU3R5bGVUYWc6IGZ1bmN0aW9uIChpZCwgY3NzKSB7XG4gICAgICByZXR1cm4gJCgnPHN0eWxlPicgKyBjc3Muam9pbignXFxuJykgKyAnPC9zdHlsZT4nKS5hdHRyKCdpZCcsIGlkKTtcbiAgICB9LFxuICAgIGNsZWFyQ3NzOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHZhciBzdHlsZUlkID0gQmlnVGV4dC5nZXRTdHlsZUlkKGlkKTtcbiAgICAgICQoJyMnICsgc3R5bGVJZCkucmVtb3ZlKCk7XG4gICAgfSxcbiAgICBnZW5lcmF0ZUNzczogZnVuY3Rpb24gKGlkLCBsaW5lc0ZvbnRTaXplcywgbGluZVdvcmRTcGFjaW5ncywgbWluRm9udFNpemVzKSB7XG4gICAgICB2YXIgY3NzID0gW107XG5cbiAgICAgIEJpZ1RleHQuY2xlYXJDc3MoaWQpO1xuXG4gICAgICBmb3IgKHZhciBqID0gMCwgayA9IGxpbmVzRm9udFNpemVzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICBjc3MucHVzaCgnIycgKyBpZCArICcgLicgKyBCaWdUZXh0LkxJTkVfQ0xBU1NfUFJFRklYICsgaiArICcgeycgKyAobWluRm9udFNpemVzW2pdID8gJyB3aGl0ZS1zcGFjZTogbm9ybWFsOycgOiAnJykgKyAobGluZXNGb250U2l6ZXNbal0gPyAnIGZvbnQtc2l6ZTogJyArIGxpbmVzRm9udFNpemVzW2pdICsgJ3B4OycgOiAnJykgKyAobGluZVdvcmRTcGFjaW5nc1tqXSA/ICcgd29yZC1zcGFjaW5nOiAnICsgbGluZVdvcmRTcGFjaW5nc1tqXSArICdweDsnIDogJycpICsgJ30nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIEJpZ1RleHQuZ2VuZXJhdGVTdHlsZVRhZyhCaWdUZXh0LmdldFN0eWxlSWQoaWQpLCBjc3MpO1xuICAgIH0sXG4gICAgalF1ZXJ5TWV0aG9kOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgQmlnVGV4dC5pbml0KCk7XG5cbiAgICAgIG9wdGlvbnMgPSAkLmV4dGVuZCh7XG4gICAgICAgIG1pbmZvbnRzaXplOiBCaWdUZXh0LkRFRkFVTFRfTUlOX0ZPTlRfU0laRV9QWCxcbiAgICAgICAgbWF4Zm9udHNpemU6IEJpZ1RleHQuREVGQVVMVF9NQVhfRk9OVF9TSVpFX1BYLFxuICAgICAgICBjaGlsZFNlbGVjdG9yOiAnJyxcbiAgICAgICAgcmVzaXplOiB0cnVlXG4gICAgICB9LCBvcHRpb25zIHx8IHt9KTtcblxuICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0ID0gJCh0aGlzKS5hZGRDbGFzcygnYmlndGV4dCcpLFxuICAgICAgICAgICAgbWF4V2lkdGggPSAkdC53aWR0aCgpLFxuICAgICAgICAgICAgaWQgPSAkdC5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgJGNoaWxkcmVuID0gb3B0aW9ucy5jaGlsZFNlbGVjdG9yID8gJHQuZmluZChvcHRpb25zLmNoaWxkU2VsZWN0b3IpIDogJHQuY2hpbGRyZW4oKTtcblxuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgaWQgPSAnYmlndGV4dC1pZCcgKyBjb3VudGVyKys7XG4gICAgICAgICAgJHQuYXR0cignaWQnLCBpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5yZXNpemUpIHtcbiAgICAgICAgICBCaWdUZXh0LmJpbmRSZXNpemUoJ3Jlc2l6ZS5iaWd0ZXh0LWV2ZW50LScgKyBpZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gVE9ETyBvbmx5IGNhbGwgdGhpcyBpZiB0aGUgd2lkdGggaGFzIGNoYW5nZWQuXG4gICAgICAgICAgICBCaWdUZXh0LmpRdWVyeU1ldGhvZC5jYWxsKCQoJyMnICsgaWQpLCBvcHRpb25zKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIEJpZ1RleHQuY2xlYXJDc3MoaWQpO1xuXG4gICAgICAgICRjaGlsZHJlbi5hZGRDbGFzcyhmdW5jdGlvbiAobGluZU51bWJlciwgY2xhc3NOYW1lKSB7XG4gICAgICAgICAgLy8gcmVtb3ZlIGV4aXN0aW5nIGxpbmUgY2xhc3Nlcy5cbiAgICAgICAgICByZXR1cm4gW2NsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcXFxiJyArIEJpZ1RleHQuTElORV9DTEFTU19QUkVGSVggKyAnXFxcXGQrXFxcXGInKSwgJycpLCBCaWdUZXh0LkxJTkVfQ0xBU1NfUFJFRklYICsgbGluZU51bWJlcl0uam9pbignICcpO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgc2l6ZXMgPSBjYWxjdWxhdGVTaXplcygkdCwgJGNoaWxkcmVuLCBtYXhXaWR0aCwgb3B0aW9ucy5tYXhmb250c2l6ZSwgb3B0aW9ucy5taW5mb250c2l6ZSk7XG4gICAgICAgICRoZWFkQ2FjaGUuYXBwZW5kKEJpZ1RleHQuZ2VuZXJhdGVDc3MoaWQsIHNpemVzLmZvbnRTaXplcywgc2l6ZXMud29yZFNwYWNpbmdzLCBzaXplcy5taW5Gb250U2l6ZXMpKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCdiaWd0ZXh0OmNvbXBsZXRlJyk7XG4gICAgfVxuICB9O1xuXG4gIGZ1bmN0aW9uIHRlc3RMaW5lRGltZW5zaW9ucygkbGluZSwgbWF4V2lkdGgsIHByb3BlcnR5LCBzaXplLCBpbnRlcnZhbCwgdW5pdHMsIHByZXZpb3VzV2lkdGgpIHtcbiAgICB2YXIgd2lkdGg7XG4gICAgcHJldmlvdXNXaWR0aCA9IHR5cGVvZiBwcmV2aW91c1dpZHRoID09PSAnbnVtYmVyJyA/IHByZXZpb3VzV2lkdGggOiAwO1xuICAgICRsaW5lLmNzcyhwcm9wZXJ0eSwgc2l6ZSArIHVuaXRzKTtcblxuICAgIHdpZHRoID0gJGxpbmUud2lkdGgoKTtcblxuICAgIGlmICh3aWR0aCA+PSBtYXhXaWR0aCkge1xuICAgICAgLy8gY29uc29sZS5sb2cod2lkdGgsICcgcHJldmlvdXM6ICcgKyBwcmV2aW91c1dpZHRoLCBwcm9wZXJ0eSArICcgYXQgJyArIGludGVydmFsLCAncHJpb3I6ICcgKyAocGFyc2VGbG9hdChzaXplKSAtIGludGVydmFsKSwgJ25ldzonICsgcGFyc2VGbG9hdChzaXplKSk7XG4gICAgICAkbGluZS5jc3MocHJvcGVydHksICcnKTtcblxuICAgICAgaWYgKHdpZHRoID09PSBtYXhXaWR0aCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG1hdGNoOiAnZXhhY3QnLFxuICAgICAgICAgIHNpemU6IHBhcnNlRmxvYXQoKHBhcnNlRmxvYXQoc2l6ZSkgLSAwLjEpLnRvRml4ZWQoMykpXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIFNpbmNlIHRoaXMgaXMgYW4gZXN0aW1hdGUsIHdlIGNhbGN1bGF0ZSBob3cgZmFyIG92ZXIgdGhlIHdpZHRoIHdlIHdlbnQgd2l0aCB0aGUgbmV3IHZhbHVlLlxuICAgICAgLy8gSWYgdGhpcyBpcyB3b3JkLXNwYWNpbmcgKG91ciBsYXN0IHJlc29ydCBndWVzcykgYW5kIHRoZSBvdmVyIGlzIGxlc3MgdGhhbiB0aGUgdW5kZXIsIHdlIGtlZXAgdGhlIGhpZ2hlciB2YWx1ZS5cbiAgICAgIC8vIE90aGVyd2lzZSwgd2UgcmV2ZXJ0IHRvIHRoZSB1bmRlcmVzdGltYXRlLlxuICAgICAgdmFyIHVuZGVyID0gbWF4V2lkdGggLSBwcmV2aW91c1dpZHRoLFxuICAgICAgICAgIG92ZXIgPSB3aWR0aCAtIG1heFdpZHRoO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBtYXRjaDogJ2VzdGltYXRlJyxcbiAgICAgICAgc2l6ZTogcGFyc2VGbG9hdCgocGFyc2VGbG9hdChzaXplKSAtIChwcm9wZXJ0eSA9PT0gJ3dvcmQtc3BhY2luZycgJiYgcHJldmlvdXNXaWR0aCAmJiBvdmVyIDwgdW5kZXIgPyAwIDogaW50ZXJ2YWwpKS50b0ZpeGVkKDMpKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gd2lkdGg7XG4gIH1cblxuICBmdW5jdGlvbiBjYWxjdWxhdGVTaXplcygkdCwgJGNoaWxkcmVuLCBtYXhXaWR0aCwgbWF4Rm9udFNpemUsIG1pbkZvbnRTaXplKSB7XG4gICAgdmFyICRjID0gJHQuY2xvbmUodHJ1ZSkuYWRkQ2xhc3MoJ2JpZ3RleHQtY2xvbmVkJykuY3NzKHtcbiAgICAgIGZvbnRGYW1pbHk6ICR0LmNzcygnZm9udC1mYW1pbHknKSxcbiAgICAgIHRleHRUcmFuc2Zvcm06ICR0LmNzcygndGV4dC10cmFuc2Zvcm0nKSxcbiAgICAgIHdvcmRTcGFjaW5nOiAkdC5jc3MoJ3dvcmQtc3BhY2luZycpLFxuICAgICAgbGV0dGVyU3BhY2luZzogJHQuY3NzKCdsZXR0ZXItc3BhY2luZycpLFxuICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgICBsZWZ0OiBCaWdUZXh0LkRFQlVHX01PREUgPyAwIDogLTk5OTksXG4gICAgICB0b3A6IEJpZ1RleHQuREVCVUdfTU9ERSA/IDAgOiAtOTk5OVxuICAgIH0pLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpO1xuXG4gICAgLy8gZm9udC1zaXplIGlzbid0IHRoZSBvbmx5IHRoaW5nIHdlIGNhbiBtb2RpZnksIHdlIGNhbiBhbHNvIG1lc3Mgd2l0aDpcbiAgICAvLyB3b3JkLXNwYWNpbmcgYW5kIGxldHRlci1zcGFjaW5nLiBXZWJLaXQgZG9lcyBub3QgcmVzcGVjdCBzdWJwaXhlbFxuICAgIC8vIGxldHRlci1zcGFjaW5nLCB3b3JkLXNwYWNpbmcsIG9yIGZvbnQtc2l6ZS5cbiAgICAvLyBUT0RPIHRyeSAtd2Via2l0LXRyYW5zZm9ybTogc2NhbGUoKSBhcyBhIHdvcmthcm91bmQuXG4gICAgdmFyIGZvbnRTaXplcyA9IFtdLFxuICAgICAgICB3b3JkU3BhY2luZ3MgPSBbXSxcbiAgICAgICAgbWluRm9udFNpemVzID0gW10sXG4gICAgICAgIHJhdGlvcyA9IFtdO1xuXG4gICAgJGNoaWxkcmVuLmNzcygnZmxvYXQnLCAnbGVmdCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRsaW5lID0gJCh0aGlzKSxcblxuICAgICAgLy8gVE9ETyByZXBsYWNlIDgsIDQgd2l0aCBhIHByb3BvcnRpb25hbCBzaXplIHRvIHRoZSBjYWxjdWxhdGVkIGZvbnQtc2l6ZS5cbiAgICAgIGludGVydmFscyA9IEJpZ1RleHQuc3VwcG9ydHMud2hvbGVOdW1iZXJGb250U2l6ZU9ubHkgPyBbOCwgNCwgMV0gOiBbOCwgNCwgMSwgMC4xXSxcbiAgICAgICAgICBsaW5lTWF4LFxuICAgICAgICAgIG5ld0ZvbnRTaXplO1xuXG4gICAgICBpZiAoJGxpbmUuaGFzQ2xhc3MoQmlnVGV4dC5FWEVNUFRfQ0xBU1MpKSB7XG4gICAgICAgIGZvbnRTaXplcy5wdXNoKG51bGwpO1xuICAgICAgICByYXRpb3MucHVzaChudWxsKTtcbiAgICAgICAgbWluRm9udFNpemVzLnB1c2goZmFsc2UpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE8gd2UgY2FuIGNhY2hlIHRoaXMgcmF0aW8/XG4gICAgICB2YXIgYXV0b0d1ZXNzU3VidHJhY3Rpb24gPSAzMixcbiAgICAgICAgICAvLyBmb250IHNpemUgaW4gcHhcbiAgICAgIGN1cnJlbnRGb250U2l6ZSA9IHBhcnNlRmxvYXQoJGxpbmUuY3NzKCdmb250LXNpemUnKSksXG4gICAgICAgICAgcmF0aW8gPSAoJGxpbmUud2lkdGgoKSAvIGN1cnJlbnRGb250U2l6ZSkudG9GaXhlZCg2KTtcblxuICAgICAgbmV3Rm9udFNpemUgPSBwYXJzZUludChtYXhXaWR0aCAvIHJhdGlvLCAxMCkgLSBhdXRvR3Vlc3NTdWJ0cmFjdGlvbjtcblxuICAgICAgb3V0ZXI6IGZvciAodmFyIG0gPSAwLCBuID0gaW50ZXJ2YWxzLmxlbmd0aDsgbSA8IG47IG0rKykge1xuICAgICAgICBpbm5lcjogZm9yICh2YXIgaiA9IDEsIGsgPSAxMDsgaiA8PSBrOyBqKyspIHtcbiAgICAgICAgICBpZiAobmV3Rm9udFNpemUgKyBqICogaW50ZXJ2YWxzW21dID4gbWF4Rm9udFNpemUpIHtcbiAgICAgICAgICAgIG5ld0ZvbnRTaXplID0gbWF4Rm9udFNpemU7XG4gICAgICAgICAgICBicmVhayBvdXRlcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaW5lTWF4ID0gdGVzdExpbmVEaW1lbnNpb25zKCRsaW5lLCBtYXhXaWR0aCwgJ2ZvbnQtc2l6ZScsIG5ld0ZvbnRTaXplICsgaiAqIGludGVydmFsc1ttXSwgaW50ZXJ2YWxzW21dLCAncHgnLCBsaW5lTWF4KTtcbiAgICAgICAgICBpZiAodHlwZW9mIGxpbmVNYXggIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBuZXdGb250U2l6ZSA9IGxpbmVNYXguc2l6ZTtcblxuICAgICAgICAgICAgaWYgKGxpbmVNYXgubWF0Y2ggPT09ICdleGFjdCcpIHtcbiAgICAgICAgICAgICAgYnJlYWsgb3V0ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhayBpbm5lcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmF0aW9zLnB1c2gobWF4V2lkdGggLyBuZXdGb250U2l6ZSk7XG5cbiAgICAgIGlmIChuZXdGb250U2l6ZSA+IG1heEZvbnRTaXplKSB7XG4gICAgICAgIGZvbnRTaXplcy5wdXNoKG1heEZvbnRTaXplKTtcbiAgICAgICAgbWluRm9udFNpemVzLnB1c2goZmFsc2UpO1xuICAgICAgfSBlbHNlIGlmICghIW1pbkZvbnRTaXplICYmIG5ld0ZvbnRTaXplIDwgbWluRm9udFNpemUpIHtcbiAgICAgICAgZm9udFNpemVzLnB1c2gobWluRm9udFNpemUpO1xuICAgICAgICBtaW5Gb250U2l6ZXMucHVzaCh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvbnRTaXplcy5wdXNoKG5ld0ZvbnRTaXplKTtcbiAgICAgICAgbWluRm9udFNpemVzLnB1c2goZmFsc2UpO1xuICAgICAgfVxuICAgIH0pLmVhY2goZnVuY3Rpb24gKGxpbmVOdW1iZXIpIHtcbiAgICAgIHZhciAkbGluZSA9ICQodGhpcyksXG4gICAgICAgICAgd29yZFNwYWNpbmcgPSAwLFxuICAgICAgICAgIGludGVydmFsID0gMSxcbiAgICAgICAgICBtYXhXb3JkU3BhY2luZztcblxuICAgICAgaWYgKCRsaW5lLmhhc0NsYXNzKEJpZ1RleHQuRVhFTVBUX0NMQVNTKSkge1xuICAgICAgICB3b3JkU3BhY2luZ3MucHVzaChudWxsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBtdXN0IHJlLXVzZSBmb250LXNpemUsIGV2ZW4gdGhvdWdoIGl0IHdhcyByZW1vdmVkIGFib3ZlLlxuICAgICAgJGxpbmUuY3NzKCdmb250LXNpemUnLCBmb250U2l6ZXNbbGluZU51bWJlcl0gKyAncHgnKTtcblxuICAgICAgZm9yICh2YXIgbSA9IDEsIG4gPSAzOyBtIDwgbjsgbSArPSBpbnRlcnZhbCkge1xuICAgICAgICBtYXhXb3JkU3BhY2luZyA9IHRlc3RMaW5lRGltZW5zaW9ucygkbGluZSwgbWF4V2lkdGgsICd3b3JkLXNwYWNpbmcnLCBtLCBpbnRlcnZhbCwgJ3B4JywgbWF4V29yZFNwYWNpbmcpO1xuICAgICAgICBpZiAodHlwZW9mIG1heFdvcmRTcGFjaW5nICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHdvcmRTcGFjaW5nID0gbWF4V29yZFNwYWNpbmcuc2l6ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAkbGluZS5jc3MoJ2ZvbnQtc2l6ZScsICcnKTtcbiAgICAgIHdvcmRTcGFjaW5ncy5wdXNoKHdvcmRTcGFjaW5nKTtcbiAgICB9KS5yZW1vdmVBdHRyKCdzdHlsZScpO1xuXG4gICAgaWYgKCFCaWdUZXh0LkRFQlVHX01PREUpIHtcbiAgICAgICRjLnJlbW92ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkYy5jc3Moe1xuICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDI1NSwyNTUsMjU1LC40KSdcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBmb250U2l6ZXM6IGZvbnRTaXplcyxcbiAgICAgIHdvcmRTcGFjaW5nczogd29yZFNwYWNpbmdzLFxuICAgICAgcmF0aW9zOiByYXRpb3MsXG4gICAgICBtaW5Gb250U2l6ZXM6IG1pbkZvbnRTaXplc1xuICAgIH07XG4gIH1cblxuICAkLmZuLmJpZ3RleHQgPSBCaWdUZXh0LmpRdWVyeU1ldGhvZDtcbiAgd2luZG93LkJpZ1RleHQgPSBCaWdUZXh0O1xufSkodGhpcywgalF1ZXJ5KTtcblxuJCgnI2JpZ3RleHQnKS5iaWd0ZXh0KCk7XG5cbmlmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yKSB7XG4gIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKCcvc3dHZXREYXRhLmpzJykudGhlbihmdW5jdGlvbiAocmVnaXN0cmF0aW9uKSB7XG4gICAgY29uc29sZS5sb2coJ1NlcnZpY2VXb3JrZXIgcmVnaXN0cmF0aW9uJywgcmVnaXN0cmF0aW9uKTtcbiAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgIHRocm93IG5ldyBFcnJvcignU2VydmljZVdvcmtlciBlcnJvcjogJyArIGVycik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBsb2FkRGF0YSgpIHtcbiAgbGV0IHd1cmwgPSAnaHR0cDovL2FwaS5iYXJ0Lmdvdi9hcGkvc3RuLmFzcHg/Y21kPXN0bnMma2V5PU1XOVMtRTdTTC0yNkRVLVZWOFYnO1xuICAkLmFqYXgoe1xuICAgIHR5cGU6IFwiR0VUXCIsXG4gICAgdXJsOiB3dXJsLFxuICAgIGRhdGFUeXBlOiBcInhtbFwiLFxuICAgIHN1Y2Nlc3M6IHBhcnNlWG1sLFxuICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAkKFwiI3JvdXRlcy1hdC1zdGF0aW9uLWhlYWRlclwiKS5jc3MoJ2NvbG9yJywgJ3JlZCcpLmh0bWwoXCJZb3UgYXJlIG9mZmxpbmUhXCIpO1xuICAgICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi12YWx1ZXNcIikuY3NzKCdjb2xvcicsICdyZWQnKS5odG1sKFwiWW91IGNhbid0IGdldCB0aGUgYWN0dWFsIGluZm9ybWF0aW9uIHJlZ2FyZGluZyB5b3VyIHRyaXAsIGJ1dCB5b3Ugc3RpbGwgaGF2ZSBhIGNoYW5jZSB0byBjaGVrIHRoZSBvZmZsaW5lIHNjaGVkdWxlIGZvciB0aGUgY2hvc2VuIHN0YXRpb25cIik7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBwYXJzZVhtbCh4bWwpIHtcbiAgICAkKFwiI3N0YXRpb25zLWxpc3RcIikuaHRtbChcIlwiKTtcbiAgICAkKHhtbCkuZmluZChcInN0YXRpb25cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAkKFwiI3N0YXRpb25zLWxpc3RcIikuYXBwZW5kKFwiPG9wdGlvbiB2YWx1ZT0nXCIgKyAkKHRoaXMpLmZpbmQoXCJuYW1lXCIpLnRleHQoKSArIFwiJyBkYXRhLXZhbHVlPSdcIiArICQodGhpcykuZmluZChcImFiYnJcIikudGV4dCgpICsgXCInPjwvb3B0aW9uPlwiKTtcbiAgICAgICQoXCIjc3RhdGlvbnMtbGlzdDJcIikuYXBwZW5kKFwiPG9wdGlvbiB2YWx1ZT0nXCIgKyAkKHRoaXMpLmZpbmQoXCJuYW1lXCIpLnRleHQoKSArIFwiJyBkYXRhLXZhbHVlPSdcIiArICQodGhpcykuZmluZChcImFiYnJcIikudGV4dCgpICsgXCInPjwvb3B0aW9uPlwiKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNob29zZVN0YXRpb24oKSB7XG4gIGxldCBjaG9zZW4gPSAkKFwiI3N0YXRpb25zLWlucHV0XCIpLnZhbCgpO1xuICBsZXQgY3VycmVudFN0YXRpb24gPSAkKFwiI3N0YXRpb25zLWxpc3Qgb3B0aW9uW3ZhbHVlPSdcIiArIGNob3NlbiArIFwiJ11cIikuYXR0cignZGF0YS12YWx1ZScpO1xuICBsZXQgd3VybCA9ICdodHRwOi8vYXBpLmJhcnQuZ292L2FwaS9zdG4uYXNweD9jbWQ9c3RuaW5mbyZrZXk9TVc5Uy1FN1NMLTI2RFUtVlY4ViZvcmlnPScgKyBjdXJyZW50U3RhdGlvbjtcbiAgJC5hamF4KHtcbiAgICB0eXBlOiBcIkdFVFwiLFxuICAgIHVybDogd3VybCxcbiAgICBkYXRhVHlwZTogXCJ4bWxcIixcbiAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBjb21wbGV0ZTogcGFyc2VYbWwyLFxuICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAkKFwiI3JvdXRlcy1hdC1zdGF0aW9uLWhlYWRlclwiKS5jc3MoJ2NvbG9yJywgJ3JlZCcpLmh0bWwoXCJZb3UgYXJlIG9mZmxpbmUhXCIpO1xuICAgICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi12YWx1ZXNcIikuY3NzKCdjb2xvcicsICdyZWQnKS5odG1sKFwiWW91IGNhbid0IGdldCB0aGUgYWN0dWFsIGluZm9ybWF0aW9uIHJlZ2FyZGluZyB5b3VyIHRyaXAsIGJ1dCB5b3Ugc3RpbGwgaGF2ZSBhIGNoYW5jZSB0byBjaGVrIHRoZSBvZmZsaW5lIHNjaGVkdWxlIGZvciB0aGUgY2hvc2VuIHN0YXRpb25cIik7XG4gICAgICAkKFwiI2FsbC1zY2hlZHVsZS1jb250ZW50XCIpLmh0bWwoXCJcIik7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBwYXJzZVhtbDIoeG1sKSB7XG4gICAgJChcIiNmb3JtLWNvbnRhaW5lcjJcIikuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi12YWx1ZXNcIikuaHRtbChcIlwiKTtcbiAgICAkKFwiI3JvdXRlcy1hdC1zdGF0aW9uLWhlYWRlclwiKS5odG1sKFwiPHA+Q2hvb3NlIHJvdXRlPC9wPlwiKTtcbiAgICAkKFwiI3N0YXRpb25zLWlucHV0MlwiKS52YWwoXCJcIik7XG4gICAgJChcIiNhbGwtc2NoZWR1bGUtY29udGVudFwiKS5odG1sKFwiXCIpO1xuICAgICQoXCIjc2NoZWQtcmVzdWx0c1wiKS5odG1sKFwiXCIpO1xuICAgIGxldCBhID0gJCh4bWwucmVzcG9uc2VUZXh0KS5maW5kKFwic3RhdGlvblwiKS5maW5kKFwibm9ydGhfcm91dGVzXCIpLmZpbmQoXCJyb3V0ZVwiKS50ZXh0KCk7XG4gICAgbGV0IGIgPSAkKHhtbC5yZXNwb25zZVRleHQpLmZpbmQoXCJzdGF0aW9uXCIpLmZpbmQoXCJzb3V0aF9yb3V0ZXNcIikuZmluZChcInJvdXRlXCIpLnRleHQoKTtcbiAgICBhID0gYS5yZXBsYWNlKC9cXHMvZywgJycpO1xuICAgIGIgPSBiLnJlcGxhY2UoL1xccy9nLCAnJyk7XG4gICAgbGV0IG5Sb3V0ZXMgPSBhLnNwbGl0KFwiUk9VVEVcIikuc2xpY2UoMik7XG4gICAgbGV0IHNSb3V0ZXMgPSBiLnNwbGl0KFwiUk9VVEVcIikuc2xpY2UoMik7XG4gICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi1oZWFkZXJcIikuaHRtbChcIlJvdXRlcyBhdCB0aGUgc3RhdGlvblwiKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5Sb3V0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICQoXCIjcm91dGVzLWF0LXN0YXRpb24tdmFsdWVzXCIpLmFwcGVuZChcIjxkaXYgY2xhc3M9J2NvbC14cy0xMCBjb2wtc20tMTAgY29sLW1kLTUgY29sLWxnLTUnIGlkPSdyb3V0ZVwiICsgblJvdXRlc1tpXSArIFwiJz48Yj48YSBvbmNsaWNrPSdjaG9vc2VSb3V0ZShcIiArIG5Sb3V0ZXNbaV0gKyBcIik7Jz5Sb3V0ZSBcIiArIG5Sb3V0ZXNbaV0gKyBcIjwvYT48L2I+PC9kaXY+XCIpO1xuICAgIH1cbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IHNSb3V0ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICQoXCIjcm91dGVzLWF0LXN0YXRpb24tdmFsdWVzXCIpLmFwcGVuZChcIjxkaXYgY2xhc3M9J2NvbC14cy0xMCBjb2wtc20tMTAgY29sLW1kLTUgY29sLWxnLTUnIGlkPSdyb3V0ZVwiICsgc1JvdXRlc1tqXSArIFwiJz48Yj48YSBvbmNsaWNrPSdjaG9vc2VSb3V0ZShcIiArIHNSb3V0ZXNbal0gKyBcIik7Jz5Sb3V0ZSBcIiArIHNSb3V0ZXNbal0gKyBcIjwvYT48L2I+PC9kaXY+XCIpO1xuICAgIH1cbiAgfVxuXG4gICQuYWpheCh7XG4gICAgdHlwZTogXCJHRVRcIixcbiAgICB1cmw6IFwiaHR0cDovL2FwaS5iYXJ0Lmdvdi9hcGkvc2NoZWQuYXNweD9jbWQ9c3Ruc2NoZWQma2V5PU1XOVMtRTdTTC0yNkRVLVZWOFYmbD0xJm9yaWc9XCIgKyBjdXJyZW50U3RhdGlvbixcbiAgICBkYXRhVHlwZTogXCJ4bWxcIixcbiAgICBzdWNjZXNzOiAkKFwiI2FsbC1zY2hlZHVsZS1saW5rXCIpLmh0bWwoXCI8YnV0dG9uIHR5cGU9J2J1dHRvbicgY2xhc3M9J2J0biBidG4tcHJpbWFyeSBidG4tbGcgYnRuLWJsb2NrJyBpZD0nb2ZmbGluZS1zY2hlZCc+T2ZmbGluZSBzY2hlZHVsZSBmb3IgXCIgKyBjaG9zZW4gKyBcIjwvYnV0dG9uPlwiKSxcbiAgICBlcnJvcjogZnVuY3Rpb24gKCkge1xuICAgICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi1oZWFkZXJcIikuY3NzKCdjb2xvcicsICdyZWQnKS5odG1sKFwiWW91IGFyZSBvZmZsaW5lIVwiKTtcbiAgICAgICQoXCIjcm91dGVzLWF0LXN0YXRpb24tdmFsdWVzXCIpLmNzcygnY29sb3InLCAncmVkJykuaHRtbChcIllvdSBjYW4ndCBnZXQgdGhlIGFjdHVhbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgeW91ciB0cmlwLCBidXQgeW91IHN0aWxsIGhhdmUgYSBjaGFuY2UgdG8gY2hlayB0aGUgb2ZmbGluZSBzY2hlZHVsZSBmb3IgdGhlIGNob3NlbiBzdGF0aW9uXCIpO1xuICAgICAgJChcIiNhbGwtc2NoZWR1bGUtY29udGVudFwiKS5odG1sKFwiXCIpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gY2hvb3NlUm91dGUoeCkge1xuICBsZXQgd3VybCA9ICdodHRwOi8vYXBpLmJhcnQuZ292L2FwaS9yb3V0ZS5hc3B4P2NtZD1yb3V0ZWluZm8ma2V5PU1XOVMtRTdTTC0yNkRVLVZWOFYmcm91dGU9JyArIHg7XG4gICQuYWpheCh7XG4gICAgdHlwZTogXCJHRVRcIixcbiAgICB1cmw6IHd1cmwsXG4gICAgZGF0YVR5cGU6IFwieG1sXCIsXG4gICAgc3VjY2VzczogcGFyc2VYbWwzLFxuICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAkKFwiI3JvdXRlcy1hdC1zdGF0aW9uLWhlYWRlclwiKS5jc3MoJ2NvbG9yJywgJ3JlZCcpLmh0bWwoXCJZb3UgYXJlIG9mZmxpbmUhXCIpO1xuICAgICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi12YWx1ZXNcIikuY3NzKCdjb2xvcicsICdyZWQnKS5odG1sKFwiWW91IGNhbid0IGdldCB0aGUgYWN0dWFsIGluZm9ybWF0aW9uIHJlZ2FyZGluZyB5b3VyIHRyaXAsIGJ1dCB5b3Ugc3RpbGwgaGF2ZSBhIGNoYW5jZSB0byBjaGVrIHRoZSBvZmZsaW5lIHNjaGVkdWxlIGZvciB0aGUgY2hvc2VuIHN0YXRpb25cIik7XG4gICAgICAkKFwiI2FsbC1zY2hlZHVsZS1jb250ZW50XCIpLmh0bWwoXCJcIik7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBwYXJzZVhtbDMoeG1sKSB7XG4gICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi1oZWFkZXJcIikuaHRtbChcIjxwPlNlbGVjdCB0aGUgZGVzdGluYXRpb24gYXQgdGhlIGNob3NlbiByb3V0ZTwvcD5cIik7XG4gICAgbGV0IGIgPSBcIiNyb3V0ZVwiICsgeDtcbiAgICBsZXQgYSA9ICQoeG1sKS5maW5kKFwic3RhdGlvblwiKS50ZXh0KCk7XG4gICAgYSA9IGEubWF0Y2goLy57NH0vZyk7XG4gICAgJChcIiNhbGwtc2NoZWR1bGUtY29udGVudFwiKS5odG1sKFwiXCIpO1xuICAgIGxldCBjaG9zZW4gPSAkKFwiI3N0YXRpb25zLWlucHV0XCIpLnZhbCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IG9uY2xpY2sgPSBcImZpbmFsRGVzdGluYXRpb24oJ1wiICsgYVtpXSArIFwiJylcIjtcbiAgICAgIGlmICgkKFwiI3N0YXRpb25zLWxpc3Qgb3B0aW9uW2RhdGEtdmFsdWU9J1wiICsgYVtpXSArIFwiJ11cIikuYXR0cigndmFsdWUnKSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGFbaV0gPT0gJChcIiNzdGF0aW9ucy1saXN0IG9wdGlvblt2YWx1ZT0nXCIgKyBjaG9zZW4gKyBcIiddXCIpLmF0dHIoJ2RhdGEtdmFsdWUnKSkge1xuICAgICAgICAgICQoYikuYXBwZW5kKFwiPHAgY2xhc3M9J3lvdS1hcmUtaGVyZSc+IFlvdSBhcmUgaGVyZTogXCIgKyAkKFwiI3N0YXRpb25zLWxpc3Qgb3B0aW9uW2RhdGEtdmFsdWU9J1wiICsgYVtpXSArIFwiJ11cIikuYXR0cigndmFsdWUnKSArIFwiPC9wPlwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkKGIpLmFwcGVuZChcIjxwPjxhIG9uY2xpY2s9XCIgKyBvbmNsaWNrICsgXCI7PlwiICsgJChcIiNzdGF0aW9ucy1saXN0IG9wdGlvbltkYXRhLXZhbHVlPSdcIiArIGFbaV0gKyBcIiddXCIpLmF0dHIoJ3ZhbHVlJykgKyBcIjwvYT48L3A+XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZmluYWxEZXN0aW5hdGlvbih4eCkge1xuICBsZXQgY2hvc2VuID0gJChcIiNzdGF0aW9ucy1pbnB1dFwiKS52YWwoKTtcbiAgbGV0IG9yZyA9ICQoXCIjc3RhdGlvbnMtbGlzdCBvcHRpb25bdmFsdWU9J1wiICsgY2hvc2VuICsgXCInXVwiKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gIGxldCB3dXJsID0gJ2h0dHA6Ly9hcGkuYmFydC5nb3YvYXBpL3NjaGVkLmFzcHg/Y21kPWFycml2ZSZkYXRlPW5vdyZrZXk9TVc5Uy1FN1NMLTI2RFUtVlY4ViZiPTAmYT0zJm9yaWc9JyArIG9yZyArICcmZGVzdD0nICsgeHg7XG4gICQuYWpheCh7XG4gICAgdHlwZTogXCJHRVRcIixcbiAgICB1cmw6IHd1cmwsXG4gICAgZGF0YVR5cGU6IFwieG1sXCIsXG4gICAgc3VjY2VzczogcGFyc2VYbWw0LFxuICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAkKFwiI3JvdXRlcy1hdC1zdGF0aW9uLWhlYWRlclwiKS5jc3MoJ2NvbG9yJywgJ3JlZCcpLmh0bWwoXCJZb3UgYXJlIG9mZmxpbmUhXCIpO1xuICAgICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi12YWx1ZXNcIikuY3NzKCdjb2xvcicsICdyZWQnKS5odG1sKFwiWW91IGNhbid0IGdldCB0aGUgYWN0dWFsIGluZm9ybWF0aW9uIHJlZ2FyZGluZyB5b3VyIHRyaXAsIGJ1dCB5b3Ugc3RpbGwgaGF2ZSBhIGNoYW5jZSB0byBjaGVrIHRoZSBvZmZsaW5lIHNjaGVkdWxlIGZvciB0aGUgY2hvc2VuIHN0YXRpb25cIik7XG4gICAgICAkKFwiI2FsbC1zY2hlZHVsZS1jb250ZW50XCIpLmh0bWwoXCJcIik7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBwYXJzZVhtbDQoeG1sKSB7XG4gICAgJChcIiNzY2hlZC1yZXN1bHRzXCIpLmh0bWwoXCJcIik7XG4gICAgJChcIiNhbGwtc2NoZWR1bGUtY29udGVudFwiKS5odG1sKFwiXCIpO1xuICAgICQoXCIjcm91dGVzLWF0LXN0YXRpb24tdmFsdWVzXCIpLmh0bWwoXCJcIik7XG4gICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi1oZWFkZXJcIikuaHRtbChcIlwiKTtcbiAgICAkKFwiI3NjaGVkLXJlc3VsdHNcIikuYXBwZW5kKFwiPGg0IGNsYXNzPSdzdWdnZXN0ZWRUaW1lJz5Zb3UgY2FuIHBpY2sgb25lIG9mIHRoZSBmb2xsb3dpbmcgdHJhaW5zIHRvIFwiICsgJChcIiNzdGF0aW9ucy1saXN0IG9wdGlvbltkYXRhLXZhbHVlPSdcIiArIHh4ICsgXCInXVwiKS5hdHRyKCd2YWx1ZScpICsgXCI8L2g0PlwiKTtcbiAgICAkKHhtbCkuZmluZChcInRyaXBcIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZGVwVGltZUFyciA9IHRoaXMuY2hpbGRyZW5bMV0ub3V0ZXJIVE1MLnNwbGl0KFwib3JpZ1RpbWVNaW49XCIpO1xuICAgICAgbGV0IGRlcFRpbWUgPSBkZXBUaW1lQXJyWzFdLnNsaWNlKDEsIDkpO1xuICAgICAgbGV0IGFyclRpbWVBcnIgPSB0aGlzLmNoaWxkcmVuWzFdLm91dGVySFRNTC5zcGxpdChcImRlc3RUaW1lTWluPVwiKTtcbiAgICAgIGxldCBhcnJUaW1lID0gYXJyVGltZUFyclsxXS5zbGljZSgxLCA5KTtcbiAgICAgIGlmIChkZXBUaW1lWzddID09ICdcIicpIHtcbiAgICAgICAgZGVwVGltZSA9IGRlcFRpbWUuc2xpY2UoMCwgLTEpO1xuICAgICAgfVxuICAgICAgaWYgKGFyclRpbWVbN10gPT0gJ1wiJykge1xuICAgICAgICBhcnJUaW1lID0gYXJyVGltZS5zbGljZSgwLCAtMSk7XG4gICAgICB9XG4gICAgICAkKFwiI3NjaGVkLXJlc3VsdHNcIikuYXBwZW5kKFwiPHAgY2xhc3M9J3N1Z2dlc3RlZFRpbWUnPkRlcGFydHVyZTogXCIgKyBkZXBUaW1lICsgXCIsIGFycml2YWw6IFwiICsgYXJyVGltZSArIFwiPC9wPlwiKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGZpbmFsRGVzdGluYXRpb24yKCkge1xuICBsZXQgY2hvc2VuID0gJChcIiNzdGF0aW9ucy1pbnB1dFwiKS52YWwoKTtcbiAgbGV0IG9yZyA9ICQoXCIjc3RhdGlvbnMtbGlzdCBvcHRpb25bdmFsdWU9J1wiICsgY2hvc2VuICsgXCInXVwiKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gIGxldCBjaG9zZW4yID0gJChcIiNzdGF0aW9ucy1pbnB1dDJcIikudmFsKCk7XG4gIGxldCBkc3QgPSAkKFwiI3N0YXRpb25zLWxpc3QyIG9wdGlvblt2YWx1ZT0nXCIgKyBjaG9zZW4yICsgXCInXVwiKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gIGxldCB3dXJsID0gJ2h0dHA6Ly9hcGkuYmFydC5nb3YvYXBpL3NjaGVkLmFzcHg/Y21kPWFycml2ZSZkYXRlPW5vdyZrZXk9TVc5Uy1FN1NMLTI2RFUtVlY4ViZiPTAmYT0zJm9yaWc9JyArIG9yZyArICcmZGVzdD0nICsgZHN0O1xuICAkLmFqYXgoe1xuICAgIHR5cGU6IFwiR0VUXCIsXG4gICAgdXJsOiB3dXJsLFxuICAgIGRhdGFUeXBlOiBcInhtbFwiLFxuICAgIHN1Y2Nlc3M6IHBhcnNlWG1sNSxcbiAgICBlcnJvcjogZnVuY3Rpb24gKCkge1xuICAgICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi1oZWFkZXJcIikuY3NzKCdjb2xvcicsICdyZWQnKS5odG1sKFwiWW91IGFyZSBvZmZsaW5lIVwiKTtcbiAgICAgICQoXCIjcm91dGVzLWF0LXN0YXRpb24tdmFsdWVzXCIpLmNzcygnY29sb3InLCAncmVkJykuaHRtbChcIllvdSBjYW4ndCBnZXQgdGhlIGFjdHVhbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgeW91ciB0cmlwLCBidXQgeW91IHN0aWxsIGhhdmUgYSBjaGFuY2UgdG8gY2hlayB0aGUgb2ZmbGluZSBzY2hlZHVsZSBmb3IgdGhlIGNob3NlbiBzdGF0aW9uXCIpO1xuICAgICAgJChcIiNhbGwtc2NoZWR1bGUtY29udGVudFwiKS5odG1sKFwiXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gcGFyc2VYbWw1KHhtbCkge1xuICAgIGxldCB4eCA9ICQoXCIjc3RhdGlvbnMtaW5wdXQyXCIpLnZhbCgpO1xuICAgICQoXCIjc2NoZWQtcmVzdWx0c1wiKS5odG1sKFwiXCIpO1xuICAgICQoXCIjYWxsLXNjaGVkdWxlLWNvbnRlbnRcIikuaHRtbChcIlwiKTtcbiAgICAkKFwiI3JvdXRlcy1hdC1zdGF0aW9uLXZhbHVlc1wiKS5odG1sKFwiXCIpO1xuICAgICQoXCIjcm91dGVzLWF0LXN0YXRpb24taGVhZGVyXCIpLmh0bWwoXCJcIik7XG4gICAgJChcIiNzY2hlZC1yZXN1bHRzXCIpLmFwcGVuZChcIjxoNCBjbGFzcz0nc3VnZ2VzdGVkVGltZSc+WW91IGNhbiBwaWNrIG9uZSBvZiB0aGUgZm9sbG93aW5nIHRyYWlucyB0byBcIiArIHh4ICsgXCI8L2g0PlwiKTtcbiAgICAkKHhtbCkuZmluZChcInRyaXBcIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZGVwVGltZUFyciA9IHRoaXMuY2hpbGRyZW5bMV0ub3V0ZXJIVE1MLnNwbGl0KFwib3JpZ1RpbWVNaW49XCIpO1xuICAgICAgbGV0IGRlcFRpbWUgPSBkZXBUaW1lQXJyWzFdLnNsaWNlKDEsIDkpO1xuICAgICAgbGV0IGFyclRpbWVBcnIgPSB0aGlzLmNoaWxkcmVuWzFdLm91dGVySFRNTC5zcGxpdChcImRlc3RUaW1lTWluPVwiKTtcbiAgICAgIGxldCBhcnJUaW1lID0gYXJyVGltZUFyclsxXS5zbGljZSgxLCA5KTtcbiAgICAgIGlmIChkZXBUaW1lWzddID09ICdcIicpIHtcbiAgICAgICAgZGVwVGltZSA9IGRlcFRpbWUuc2xpY2UoMCwgLTEpO1xuICAgICAgfVxuICAgICAgaWYgKGFyclRpbWVbN10gPT0gJ1wiJykge1xuICAgICAgICBhcnJUaW1lID0gYXJyVGltZS5zbGljZSgwLCAtMSk7XG4gICAgICB9XG4gICAgICAkKFwiI3NjaGVkLXJlc3VsdHNcIikuYXBwZW5kKFwiPHAgY2xhc3M9J3N1Z2dlc3RlZFRpbWUnPkRlcGFydHVyZTogXCIgKyBkZXBUaW1lICsgXCIsIGFycml2YWw6IFwiICsgYXJyVGltZSArIFwiPC9wPlwiKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNob3dTY2hlZHVsZSgpIHtcbiAgbGV0IGNob3NlbiA9ICQoXCIjc3RhdGlvbnMtaW5wdXRcIikudmFsKCk7XG4gIGxldCBjdXJyZW50U3RhdGlvbiA9ICQoXCIjc3RhdGlvbnMtbGlzdCBvcHRpb25bdmFsdWU9J1wiICsgY2hvc2VuICsgXCInXVwiKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gIGxldCBjdXJyZW50U3RhdGlvblZhbCA9ICQoXCIjc3RhdGlvbnMtbGlzdCBvcHRpb25bdmFsdWU9J1wiICsgY2hvc2VuICsgXCInXVwiKS5hdHRyKCd2YWx1ZScpO1xuICAkLmFqYXgoe1xuICAgIHR5cGU6IFwiR0VUXCIsXG4gICAgdXJsOiBcImh0dHA6Ly9hcGkuYmFydC5nb3YvYXBpL3NjaGVkLmFzcHg/Y21kPXN0bnNjaGVkJmtleT1NVzlTLUU3U0wtMjZEVS1WVjhWJmw9MSZvcmlnPVwiICsgY3VycmVudFN0YXRpb24sXG4gICAgZGF0YVR5cGU6IFwieG1sXCIsXG4gICAgc3VjY2VzczogcGFyc2VTY2hlZCxcbiAgICBlcnJvcjogZnVuY3Rpb24gKCkge1xuICAgICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi1oZWFkZXJcIikuY3NzKCdjb2xvcicsICdyZWQnKS5odG1sKFwiWW91IGFyZSBvZmZsaW5lIVwiKTtcbiAgICAgICQoXCIjcm91dGVzLWF0LXN0YXRpb24tdmFsdWVzXCIpLmNzcygnY29sb3InLCAncmVkJykuaHRtbChcIllvdSBjYW4ndCBnZXQgdGhlIGFjdHVhbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgeW91ciB0cmlwLCBidXQgeW91IHN0aWxsIGhhdmUgYSBjaGFuY2UgdG8gY2hlayB0aGUgb2ZmbGluZSBzY2hlZHVsZSBmb3IgdGhlIGNob3NlbiBzdGF0aW9uXCIpO1xuICAgICAgJChcIiNhbGwtc2NoZWR1bGUtY29udGVudFwiKS5odG1sKFwiXCIpO1xuICAgIH1cbiAgfSk7XG4gIGZ1bmN0aW9uIHBhcnNlU2NoZWQoeG1sKSB7XG4gICAgJChcIiNyb3V0ZXMtYXQtc3RhdGlvbi1oZWFkZXJcIikuaHRtbChcIlwiKTtcbiAgICAkKFwiI3JvdXRlcy1hdC1zdGF0aW9uLXZhbHVlc1wiKS5odG1sKFwiXCIpO1xuICAgICQoXCIjYWxsLXNjaGVkdWxlLWNvbnRlbnRcIikuaHRtbChcIlwiKTtcbiAgICAkKFwiI3NjaGVkLXJlc3VsdHNcIikuaHRtbChcIlwiKTtcbiAgICBsZXQgY2hvc2VuID0gJChcIiNzdGF0aW9ucy1pbnB1dFwiKS52YWwoKTtcbiAgICBsZXQgY3VycmVudFN0YXRpb24gPSAkKFwiI3N0YXRpb25zLWxpc3Qgb3B0aW9uW3ZhbHVlPSdcIiArIGNob3NlbiArIFwiJ11cIikuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICQoXCIjYWxsLXNjaGVkdWxlLWxpbmtcIikuaHRtbChcIjxidXR0b24gdHlwZT0nYnV0dG9uJyBjbGFzcz0nYnRuIGJ0bi1wcmltYXJ5IGJ0bi1sZyBidG4tYmxvY2snIGlkPSdvZmZsaW5lLXNjaGVkJz5PZmZsaW5lIHNjaGVkdWxlIGZvciBcIiArIGN1cnJlbnRTdGF0aW9uVmFsICsgXCI8L2J1dHRvbj5cIik7XG4gICAgbGV0IHRoZUxpc3QgPSB4bWwuY2hpbGRyZW5bMF0uaW5uZXJIVE1MO1xuICAgIHRoZUxpc3QgPSB0aGVMaXN0LnNwbGl0KFwiPGl0ZW0gbGluZT1cIikuc2xpY2UoMSk7XG4gICAgbGV0IG15QmlnVGFibGUgPSBcIjx0YWJsZSBjbGFzcz0ndGFibGUgdGFibGUtaG92ZXIgdGFibGUtcmVzcG9uc2l2ZSB0YWJsZS1zdHJpcGVkJyBpZD0nc2NoZWQtdGFibGUnPjx0aGVhZCBjbGFzcz0nY2VudGVyJz48dHIgY2xhc3M9J3Jvdyc+PHRoIGNsYXNzPSdjb2wteHMtMyBjb2wtc20tMyBjb2wtbWQtMyBjb2wtbGctMyc+Um91dGU8L3RoPjx0aCBjbGFzcz0nY29sLXhzLTMgY29sLXNtLTMgY29sLW1kLTMgY29sLWxnLTMnPkRlc3RpbmF0aW9uPC90aD48dGggY2xhc3M9J2NvbC14cy0zIGNvbC1zbS0zIGNvbC1tZC0zIGNvbC1sZy0zJz5EZXBhcnR1cmUgdGltZTwvdGg+PHRoIGNsYXNzPSdjb2wteHMtMyBjb2wtc20tMyBjb2wtbWQtMyBjb2wtbGctMyc+QXJyaXZhbCB0aW1lPC90aD48L3RyPjwvdGhlYWQ+PHRib2R5PlwiO1xuICAgIGZvciAobGV0IGggPSAwOyBoIDwgdGhlTGlzdC5sZW5ndGg7IGgrKykge1xuICAgICAgbGV0IGNvbHVtblJvdXRlID0gdGhlTGlzdFtoXS5zbGljZSgxLCA5KTtcbiAgICAgIGlmIChjb2x1bW5Sb3V0ZVs3XSA9PSAnXCInKSB7XG4gICAgICAgIGNvbHVtblJvdXRlID0gY29sdW1uUm91dGUuc2xpY2UoMCwgLTEpO1xuICAgICAgfVxuICAgICAgbGV0IGNvbHVtbkRlc3RBcnIgPSB0aGVMaXN0W2hdLnNwbGl0KFwidHJhaW5IZWFkU3RhdGlvbj1cIik7XG4gICAgICBsZXQgY29sdW1uRGVzdEFiciA9IGNvbHVtbkRlc3RBcnJbMV0uc2xpY2UoMSwgNSk7XG4gICAgICBsZXQgY29sdW1uRGVzdCA9ICQoXCIjc3RhdGlvbnMtbGlzdCBvcHRpb25bZGF0YS12YWx1ZT0nXCIgKyBjb2x1bW5EZXN0QWJyICsgXCInXVwiKS5hdHRyKCd2YWx1ZScpO1xuICAgICAgbGV0IGNvbHVtblN0YXJ0RGVwQXJyID0gdGhlTGlzdFtoXS5zcGxpdChcIm9yaWdUaW1lPVwiKTtcbiAgICAgIGxldCBjb2x1bW5TdGFydERlcCA9IGNvbHVtblN0YXJ0RGVwQXJyWzFdLnNsaWNlKDEsIDkpO1xuICAgICAgaWYgKGNvbHVtblN0YXJ0RGVwWzddID09ICdcIicpIHtcbiAgICAgICAgY29sdW1uU3RhcnREZXAgPSBjb2x1bW5TdGFydERlcC5zbGljZSgwLCAtMSk7XG4gICAgICB9XG4gICAgICBsZXQgY29sdW1uRmluYWxBcnJBcnIgPSB0aGVMaXN0W2hdLnNwbGl0KFwiZGVzdFRpbWU9XCIpO1xuICAgICAgbGV0IGNvbHVtbkZpbmFsQXJyID0gY29sdW1uRmluYWxBcnJBcnJbMV0uc2xpY2UoMSwgOSk7XG4gICAgICBpZiAoY29sdW1uRmluYWxBcnJbN10gPT0gJ1wiJykge1xuICAgICAgICBjb2x1bW5GaW5hbEFyciA9IGNvbHVtbkZpbmFsQXJyLnNsaWNlKDAsIC0xKTtcbiAgICAgIH1cbiAgICAgIG15QmlnVGFibGUgPSBteUJpZ1RhYmxlICsgXCI8dHIgY2xhc3M9J3Jvdyc+PHRkIGNsYXNzPSdjb2wteHMtMyBjb2wtc20tMyBjb2wtbWQtMyBjb2wtbGctMyc+XCIgKyBjb2x1bW5Sb3V0ZSArIFwiPC90ZD48dGQgY2xhc3M9J2NvbC14cy0zIGNvbC1zbS0zIGNvbC1tZC0zIGNvbC1sZy0zJz5cIiArIGNvbHVtbkRlc3QgKyBcIjwvdGQ+PHRkIGNsYXNzPSdjb2wteHMtMyBjb2wtc20tMyBjb2wtbWQtMyBjb2wtbGctMyc+XCIgKyBjb2x1bW5TdGFydERlcCArIFwiPC90ZD48dGQgY2xhc3M9J2NvbC14cy0zIGNvbC1zbS0zIGNvbC1tZC0zIGNvbC1sZy0zJz5cIiArIGNvbHVtbkZpbmFsQXJyICsgXCI8L3RkPjwvdHI+XCI7XG4gICAgfVxuICAgIG15QmlnVGFibGUgPSBteUJpZ1RhYmxlICsgXCI8L3Rib2R5PjwvdGFibGU+XCI7XG4gICAgJChcIiNhbGwtc2NoZWR1bGUtY29udGVudFwiKS5hcHBlbmQobXlCaWdUYWJsZSk7XG4gIH1cbn1cblxuJCgnI2Zvcm0tY29udGFpbmVyJykuc3VibWl0KGNob29zZVN0YXRpb24pO1xuJCgnI2Zvcm0tY29udGFpbmVyMicpLnN1Ym1pdChmaW5hbERlc3RpbmF0aW9uMik7XG4kKCcjYWxsLXNjaGVkdWxlLWxpbmsnKS5jbGljayhzaG93U2NoZWR1bGUpO1xuLy8tIGVuZGluamVjdFxuLy8tIGluamVjdDpwbHVnaW5zXG5cbi8vLSBlbmRpbmplY3QiXSwiZmlsZSI6Im1haW4uanMifQ==
