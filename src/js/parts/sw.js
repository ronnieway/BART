if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/swGetData.js')
		.then(function(registration) {
			console.log('ServiceWorker registration', registration);
		}).catch(function(err) {
			console.log('ServiceWorker error: ' + err);
		});
}
