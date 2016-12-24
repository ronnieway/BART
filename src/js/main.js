//- inject:parts
/*! BigText - v0.1.7a - 2014-07-18
 * https://github.com/zachleat/bigtext
 * Copyright (c) 2014 Zach Leatherman (@zachleat)
 * MIT License */

(function(window, $) {
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
      noConflict: function(restore)
      {
        if(restore) {
          $.fn.bigtext = oldjQueryMethod;
          window.BigText = oldBigText;
        }
        return BigText;
      },
      test: {
        wholeNumberFontSizeOnly: function() {
          if( !( 'getComputedStyle' in window ) || document.body == null ) {
            return true;
          }
          var test = $('<div/>').css({
              position: 'absolute',
              'font-size': '14.1px'
            }).appendTo(document.body).get(0),
            computedStyle = window.getComputedStyle( test, null );

          if( computedStyle ) {
            return computedStyle.getPropertyValue( 'font-size' ) === '14px';
          }
          return true;
        }
      },
      supports: {
        wholeNumberFontSizeOnly: undefined
      },
      init: function() {
        if( BigText.supports.wholeNumberFontSizeOnly === undefined ) {
          BigText.supports.wholeNumberFontSizeOnly = BigText.test.wholeNumberFontSizeOnly();
        }

        if(!$('#'+BigText.GLOBAL_STYLE_ID).length) {
          $headCache.append(BigText.generateStyleTag(BigText.GLOBAL_STYLE_ID, ['.bigtext * { white-space: nowrap; } .bigtext > * { display: block; }',
                                          '.bigtext .' + BigText.EXEMPT_CLASS + ', .bigtext .' + BigText.EXEMPT_CLASS + ' * { white-space: normal; }']));
        }
      },
      bindResize: function(eventName, resizeFunction) {
        if($.throttle) {
          // https://github.com/cowboy/jquery-throttle-debounce
          $(window).unbind(eventName).bind(eventName, $.throttle(100, resizeFunction));
        } else {
          if($.fn.smartresize) {
            // https://github.com/lrbabe/jquery-smartresize/
            eventName = 'smartresize.' + eventName;
          }
          $(window).unbind(eventName).bind(eventName, resizeFunction);
        }
      },
      getStyleId: function(id)
      {
        return BigText.STYLE_ID + '-' + id;
      },
      generateStyleTag: function(id, css)
      {
        return $('<style>' + css.join('\n') + '</style>').attr('id', id);
      },
      clearCss: function(id)
      {
        var styleId = BigText.getStyleId(id);
        $('#' + styleId).remove();
      },
      generateCss: function(id, linesFontSizes, lineWordSpacings, minFontSizes)
      {
        var css = [];

        BigText.clearCss(id);

        for(var j=0, k=linesFontSizes.length; j<k; j++) {
          css.push('#' + id + ' .' + BigText.LINE_CLASS_PREFIX + j + ' {' +
            (minFontSizes[j] ? ' white-space: normal;' : '') +
            (linesFontSizes[j] ? ' font-size: ' + linesFontSizes[j] + 'px;' : '') +
            (lineWordSpacings[j] ? ' word-spacing: ' + lineWordSpacings[j] + 'px;' : '') +
            '}');
        }

        return BigText.generateStyleTag(BigText.getStyleId(id), css);
      },
      jQueryMethod: function(options)
      {
        BigText.init();

        options = $.extend({
          minfontsize: BigText.DEFAULT_MIN_FONT_SIZE_PX,
          maxfontsize: BigText.DEFAULT_MAX_FONT_SIZE_PX,
          childSelector: '',
          resize: true
        }, options || {});

        this.each(function()
        {
          var $t = $(this).addClass('bigtext'),
            maxWidth = $t.width(),
            id = $t.attr('id'),
            $children = options.childSelector ? $t.find( options.childSelector ) : $t.children();

          if(!id) {
            id = 'bigtext-id' + (counter++);
            $t.attr('id', id);
          }

          if(options.resize) {
            BigText.bindResize('resize.bigtext-event-' + id, function()
            {
              // TODO only call this if the width has changed.
              BigText.jQueryMethod.call($('#' + id), options);
            });
          }

          BigText.clearCss(id);

          $children.addClass(function(lineNumber, className)
          {
            // remove existing line classes.
            return [className.replace(new RegExp('\\b' + BigText.LINE_CLASS_PREFIX + '\\d+\\b'), ''),
                BigText.LINE_CLASS_PREFIX + lineNumber].join(' ');
          });

          var sizes = calculateSizes($t, $children, maxWidth, options.maxfontsize, options.minfontsize);
          $headCache.append(BigText.generateCss(id, sizes.fontSizes, sizes.wordSpacings, sizes.minFontSizes));
        });

        return this.trigger('bigtext:complete');
      }
    };

  function testLineDimensions($line, maxWidth, property, size, interval, units, previousWidth)
  {
    var width;
    previousWidth = typeof previousWidth === 'number' ? previousWidth : 0;
    $line.css(property, size + units);

    width = $line.width();

    if(width >= maxWidth) {
// console.log(width, ' previous: ' + previousWidth, property + ' at ' + interval, 'prior: ' + (parseFloat(size) - interval), 'new:' + parseFloat(size));
      $line.css(property, '');

      if(width === maxWidth) {
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
        size: parseFloat((parseFloat(size) - (property === 'word-spacing' && previousWidth && ( over < under ) ? 0 : interval)).toFixed(3))
      };
    }

    return width;
  }

  function calculateSizes($t, $children, maxWidth, maxFontSize, minFontSize)
  {
    var $c = $t.clone(true)
      .addClass('bigtext-cloned')
      .css({
        fontFamily: $t.css('font-family'),
        textTransform: $t.css('text-transform'),
        wordSpacing: $t.css('word-spacing'),
        letterSpacing: $t.css('letter-spacing'),
        position: 'absolute',
        left: BigText.DEBUG_MODE ? 0 : -9999,
        top: BigText.DEBUG_MODE ? 0 : -9999
      })
      .appendTo(document.body);

    // font-size isn't the only thing we can modify, we can also mess with:
    // word-spacing and letter-spacing. WebKit does not respect subpixel
    // letter-spacing, word-spacing, or font-size.
    // TODO try -webkit-transform: scale() as a workaround.
    var fontSizes = [],
      wordSpacings = [],
      minFontSizes = [],
      ratios = [];

    $children.css('float', 'left').each(function() {
      var $line = $(this),
        // TODO replace 8, 4 with a proportional size to the calculated font-size.
        intervals = BigText.supports.wholeNumberFontSizeOnly ? [8, 4, 1] : [8, 4, 1, 0.1],
        lineMax,
        newFontSize;

      if($line.hasClass(BigText.EXEMPT_CLASS)) {
        fontSizes.push(null);
        ratios.push(null);
        minFontSizes.push(false);
        return;
      }

      // TODO we can cache this ratio?
      var autoGuessSubtraction = 32, // font size in px
        currentFontSize = parseFloat($line.css('font-size')),
        ratio = ( $line.width() / currentFontSize ).toFixed(6);

      newFontSize = parseInt( maxWidth / ratio, 10 ) - autoGuessSubtraction;

      outer: for(var m=0, n=intervals.length; m<n; m++) {
        inner: for(var j=1, k=10; j<=k; j++) {
          if(newFontSize + j*intervals[m] > maxFontSize) {
            newFontSize = maxFontSize;
            break outer;
          }

          lineMax = testLineDimensions($line, maxWidth, 'font-size', newFontSize + j*intervals[m], intervals[m], 'px', lineMax);
          if(typeof lineMax !== 'number') {
            newFontSize = lineMax.size;

            if(lineMax.match === 'exact') {
              break outer;
            }
            break inner;
          }
        }
      }

      ratios.push(maxWidth / newFontSize);

      if(newFontSize > maxFontSize) {
        fontSizes.push(maxFontSize);
        minFontSizes.push(false);
      } else if(!!minFontSize && newFontSize < minFontSize) {
        fontSizes.push(minFontSize);
        minFontSizes.push(true);
      } else {
        fontSizes.push(newFontSize);
        minFontSizes.push(false);
      }
    }).each(function(lineNumber) {
      var $line = $(this),
        wordSpacing = 0,
        interval = 1,
        maxWordSpacing;

      if($line.hasClass(BigText.EXEMPT_CLASS)) {
        wordSpacings.push(null);
        return;
      }

      // must re-use font-size, even though it was removed above.
      $line.css('font-size', fontSizes[lineNumber] + 'px');

      for(var m=1, n=3; m<n; m+=interval) {
        maxWordSpacing = testLineDimensions($line, maxWidth, 'word-spacing', m, interval, 'px', maxWordSpacing);
        if(typeof maxWordSpacing !== 'number') {
          wordSpacing = maxWordSpacing.size;
          break;
        }
      }

      $line.css('font-size', '');
      wordSpacings.push(wordSpacing);
    }).removeAttr('style');

    if( !BigText.DEBUG_MODE ) {
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
		navigator.serviceWorker.register('/swGetData.js')
		.then(function(registration) {
			console.log('ServiceWorker registration', registration);
		}).catch(function(err) {
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
		error: function() {
			$("#routes-at-station-header").css('color', 'red').html("You are offline!");
			$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to chek the offline schedule for the chosen station");
		}
	});

	function parseXml(xml) {
		$("#stations-list").html("");
		$(xml).find("station").each(function() {
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
		success: function(data){
			return data;
		},
		complete: parseXml2,
		error: function() {
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
		let nRoutes= a.split("ROUTE").slice(2);
		let sRoutes= b.split("ROUTE").slice(2);
		$("#routes-at-station-header").html("<h4>Routes here</h4>");
		for (let i=0; i<nRoutes.length; i++) {
			$("#routes-at-station-values").append("<div id='route" + nRoutes[i] + "'><b><a onclick='chooseRoute(" + nRoutes[i] + ");'>Route " + nRoutes[i] + "</a></b></div>");
		}		
		for (let j=0; j<sRoutes.length; j++) {
			$("#routes-at-station-values").append("<div id='route" + sRoutes[j] + "'><b><a onclick='chooseRoute(" + sRoutes[j] + ");'>Route " + sRoutes[j] + "</a></b></div>");
		}	
	}

	$.ajax({
		type: "GET",
		url: "http://api.bart.gov/api/sched.aspx?cmd=stnsched&key=MW9S-E7SL-26DU-VV8V&l=1&orig=" + currentStation,
		dataType: "xml",
		success: $("#all-schedule-link").html("<button type='button' class='btn btn-primary btn-lg btn-block' id='offline-sched'>Offline schedule for " + chosen + "</button>"),
		error: function() {
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
		error: function() {
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
		for (let i=0; i<a.length; i++) {
			let onclick = "finalDestination('" + a[i] + "')";
			if ($("#stations-list option[data-value='" + a[i] + "']").attr('value') != undefined) {
				if(a[i] == $("#stations-list option[value='" + chosen + "']").attr('data-value')) {
					$(b).append("<p> You are here: " + $("#stations-list option[data-value='" + a[i] + "']").attr('value') + "</p>");
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
		error: function() {
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
		$("#sched-results").append("<h4>You can pick one of these following trains to " + $("#stations-list option[data-value='" + xx + "']").attr('value') + "</h4>");
		$(xml).find("trip").each(function() {			
			let depTimeArr = this.children[1].outerHTML.split("origTimeMin=");
			let depTime = depTimeArr[1].slice(1,9);
			let arrTimeArr = this.children[1].outerHTML.split("destTimeMin=");
			let arrTime = arrTimeArr[1].slice(1,9);
			if (depTime[8] == '"') {
				depTime = depTime.slice(0,-1);
			}
			if (arrTime[8] == '"') {
				arrTime = arrTime.slice(0,-1);
			}
			$("#sched-results").append("<p>Departure: " + depTime + ", arrival: " + arrTime + "</p>");
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
			error: function() {
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
		$("#sched-results").append("<h4>You can pick one of these following trains to " + xx + "</h4>");
		$(xml).find("trip").each(function() {			
			let depTimeArr = this.children[1].outerHTML.split("origTimeMin=");
			let depTime = depTimeArr[1].slice(1,9);
			let arrTimeArr = this.children[1].outerHTML.split("destTimeMin=");
			let arrTime = arrTimeArr[1].slice(1,9);
			if (depTime[8] == '"') {
				depTime = depTime.slice(0,-1);
			}
			if (arrTime[8] == '"') {
				arrTime = arrTime.slice(0,-1);
			}
			$("#sched-results").append("<p>Departure: " + depTime + ", arrival: " + arrTime + "</p>");
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
		error: function() {
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
		$("#all-schedule-content").append("<table class='table table-hover table-responsive' id='sched-table'><thead><th>Route</th><th>Destination</th><th>Departure time</th><th>Arrival time</th></thead>");
		for (let h=0; h<theList.length; h++) {
			
			let columnRoute = theList[h].slice(1, 9);
			if (columnRoute[7] == '"') {
				columnRoute = columnRoute.slice(0,-1);
			}
			let columnDestArr = theList[h].split("trainHeadStation=");
			let columnDestAbr = columnDestArr[1].slice(1, 5);
			let columnDest = $("#stations-list option[data-value='" + columnDestAbr + "']").attr('value');
			let columnStartDepArr = theList[h].split("origTime=");
			let columnStartDep = columnStartDepArr[1].slice(1, 9);
			if (columnStartDep[7] == '"') {
				columnStartDep = columnStartDep.slice(0,-1);
			}
			let columnFinalArrArr = theList[h].split("destTime=");
			let columnFinalArr = columnFinalArrArr[1].slice(1, 9);
			if (columnFinalArr[7] == '"') {
				columnFinalArr = columnFinalArr.slice(0,-1);
			}
			$("#all-schedule-content").append("<tr class='col-xs-12 col-sm-12 col-md-12 col-lg-12'><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnRoute + "</td><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnDest + "</td><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnStartDep + "</td><td class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>" + columnFinalArr + "</td></tr>");
		}
		$("#all-schedule-content").append("</table>");
	}
}


$('#form-container').submit(chooseStation);
$('#form-container2').submit(finalDestination2);
$('#all-schedule-link').click(showSchedule);
//- endinject
//- inject:plugins

//- endinject
