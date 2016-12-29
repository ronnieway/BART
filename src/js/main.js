//- inject:parts
if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/swGetData.js')
		.then(function(registration) {
			console.log('ServiceWorker registration', registration);
		}).catch(function(err) {
			console.log('ServiceWorker error: ' + err);
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
			$("#routes-at-station-header").css({'color': 'red', 'padding': '5px', 'border': '1px solid red'}).html("You are offline!");
			$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to check the offline schedule for the chosen station");
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
			$("#routes-at-station-header").css({'color': 'red', 'padding': '5px', 'border': '1px solid red'}).html("You are offline!");
			$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to check the offline schedule for the chosen station");
			$("#all-schedule-content").html("");
		}
	});

	function parseXml2(xml) {
		$("#form-container2").css('display', 'block');
		$("#routes-at-station-values").html("");
		$("#routes-at-station-header").html("<p>Choose route</p>").css({'color': 'white', 'padding': '5px', 'border': '0'});
		$("#stations-input2").val("");
		$("#all-schedule-content").html("");
		$("#sched-results").html("");
		let a = $(xml.responseText).find("station").find("north_routes").find("route").text();
		let b = $(xml.responseText).find("station").find("south_routes").find("route").text();
		a = a.replace(/\s/g, '');
		b = b.replace(/\s/g, '');
		let nRoutes= a.split("ROUTE").slice(2);
		let sRoutes= b.split("ROUTE").slice(2);
		$("#routes-at-station-header").html("Routes at the station:").css({'color': 'white', 'padding': '5px', 'border': '0'});
		for (let i=0; i<nRoutes.length; i++) {
			$("#routes-at-station-values").append("<div class='col-xs-6 col-sm-6 col-md-5 col-lg-5' id='route" + nRoutes[i] + "'><b><a onclick='chooseRoute(" + nRoutes[i] + ");'>Route " + nRoutes[i] + "</a></b></div>");
		}		
		for (let j=0; j<sRoutes.length; j++) {
			$("#routes-at-station-values").append("<div class='col-xs-6 col-sm-6 col-md-5 col-lg-5' id='route" + sRoutes[j] + "'><b><a onclick='chooseRoute(" + sRoutes[j] + ");'>Route " + sRoutes[j] + "</a></b></div>");
		}	
	}

	$.ajax({
		type: "GET",
		url: "http://api.bart.gov/api/sched.aspx?cmd=stnsched&key=MW9S-E7SL-26DU-VV8V&l=1&orig=" + currentStation,
		dataType: "xml",
		success: $("#all-schedule-link").html("<button type='button' class='btn btn-primary btn-lg btn-block' id='offline-sched'>Offline schedule for " + chosen + "</button>"),
		error: function() {
			$("#form-container2").css('display', 'none');
			$("#routes-at-station-header").css({'color': 'red', 'padding': '5px', 'border': '1px solid red'}).html("You are offline!");
			$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to check the offline schedule for the chosen station");
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
			$("#form-container2").css('display', 'none');
			$("#routes-at-station-header").css({'color': 'red', 'padding': '5px', 'border': '1px solid red'}).html("You are offline!");
			$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to check the offline schedule for the chosen station");
			$("#all-schedule-content").html("");
		}
	});

	function parseXml3(xml) {
		$("#routes-at-station-header").html("Select the destination at the chosen route").css({'color': 'white', 'padding': '5px', 'border': '0'});
		let b = "#route" + x;
		let a = $(xml).find("station").text();
		a = a.match(/.{4}/g);
		$("#all-schedule-content").html("");
		let chosen = $("#stations-input").val();
		for (let i=0; i<a.length; i++) {
			let onclick = "finalDestination('" + a[i] + "')";
			if ($("#stations-list option[data-value='" + a[i] + "']").attr('value') != undefined) {
				if(a[i] == $("#stations-list option[value='" + chosen + "']").attr('data-value')) {
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
		error: function() {
			$("#form-container2").css('display', 'none');
			$("#routes-at-station-header").css({'color': 'red', 'padding': '5px', 'border': '1px solid red'}).html("You are offline!");
			$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to check the offline schedule for the chosen station");
			$("#all-schedule-content").html("");
		}
	});

	function parseXml4(xml) {
		$("#sched-results").html("");
		$("#all-schedule-content").html("");
		$("#routes-at-station-values").html("");
		$("#routes-at-station-header").html("").css({'color': 'white', 'padding': '5px', 'border': '0'});
		$("#sched-results").append("<div id='suggestedTime' class='col-xs-12 col-sm-12 col-md-12 col-lg-12'><h4>You can pick one of the following trains to " + $("#stations-list option[data-value='" + xx + "']").attr('value') + "</h4></div>");
		$(xml).find("trip").each(function() {			
			let depTimeArr = this.children[1].outerHTML.split("origTimeMin=");
			let depTime = depTimeArr[1].slice(1,9);
			let arrTimeArr = this.children[1].outerHTML.split("destTimeMin=");
			let arrTime = arrTimeArr[1].slice(1,9);
			if (depTime[7] == '"') {
				depTime = depTime.slice(0,-1);
			}
			if (arrTime[7] == '"') {
				arrTime = arrTime.slice(0,-1);
			}
			$("#suggestedTime").append("<div class='suggestedTime'>Departure: " + depTime + ", arrival: " + arrTime + "</div>");
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
				$("#form-container2").css('display', 'none');
				$("#routes-at-station-header").css({'color': 'red', 'padding': '5px', 'border': '1px solid red'}).html("You are offline!");
				$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to check the offline schedule for the chosen station");
				$("#all-schedule-content").html("");
			}
		});

	function parseXml5(xml) {
		let xx = $("#stations-input2").val();
		$("#sched-results").html("");
		$("#all-schedule-content").html("");
		$("#routes-at-station-values").html("");
		$("#routes-at-station-header").html("").css({'color': 'white', 'padding': '5px', 'border': '0'});
		$("#sched-results").append("<div id='suggestedTime' class='col-xs-12 col-sm-12 col-md-12 col-lg-12'><h4>You can pick one of the following trains to " + xx + "</h4></div>");
		$(xml).find("trip").each(function() {			
			let depTimeArr = this.children[1].outerHTML.split("origTimeMin=");
			let depTime = depTimeArr[1].slice(1,9);
			let arrTimeArr = this.children[1].outerHTML.split("destTimeMin=");
			let arrTime = arrTimeArr[1].slice(1,9);
			if (depTime[7] == '"') {
				depTime = depTime.slice(0,-1);
			}
			if (arrTime[7] == '"') {
				arrTime = arrTime.slice(0,-1);
			}
			$("#suggestedTime").append("<div class='suggestedTime col-xs-12 col-sm-12 col-md-12 col-lg-12'>Departure: " + depTime + ", arrival: " + arrTime + "</div>");
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
			$("#form-container2").css('display', 'none');
			$("#routes-at-station-header").css({'color': 'red', 'padding': '5px', 'border': '1px solid red'}).html("You are offline!");
			$("#routes-at-station-values").css('color', 'red').html("You can't get the actual information regarding your trip, but you still have a chance to check the offline schedule for the chosen station");
			$("#all-schedule-content").html("");
			$("#all-schedule-content").append("<h4 class='text-center'>Sorry, schedule wasn't loaded. Here is routes map.</h4>").css('color', 'red');
			$("#all-schedule-content").append("<img id='the-routes-map' src='img/map.gif'>");
		}
	});
	function parseSched(xml) {
		$("#routes-at-station-header").html("").css({'color': 'white', 'padding': '5px', 'border': '0'});
		$("#routes-at-station-values").html("");
		$("#all-schedule-content").html("");
		$("#sched-results").html("");
		let chosen = $("#stations-input").val();
		let currentStation = $("#stations-list option[value='" + chosen + "']").attr('data-value');
		$("#all-schedule-link").html("<button type='button' class='btn btn-primary btn-lg btn-block' id='offline-sched'>Offline schedule for " + currentStationVal + "</button>");
		let theList = xml.children[0].innerHTML;
		theList = theList.split("<item line=").slice(1);
		let myBigTable = "<table class='table table-hover table-responsive table-striped' id='sched-table'><thead class='center'><tr class='row'><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Route</th><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Destination</th><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Departure time</th><th class='col-xs-3 col-sm-3 col-md-3 col-lg-3'>Arrival time</th></tr></thead><tbody>";
		for (let h=0; h<theList.length; h++) {
			let columnRoute = theList[h].slice(7, 9);
			if (columnRoute[1] == '"') {
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
