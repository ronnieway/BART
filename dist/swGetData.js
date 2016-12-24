this.addEventListener('load', function () {
	// At first, let's check if we have permission for notification
	// If not, let's ask for it
	if (window.Notification && Notification.permission !== "granted") {
		Notification.requestPermission(function (status) {
			if (Notification.permission !== status) {
				Notification.permission = status;
			}
		});
	}
});

this.addEventListener('install', function (event) {
	event.waitUntil(caches.open('BART-transportation-data').then(function (cache) {
		return cache.addAll(['/', '/index.html', '/README.md', '/css/main.css', '/js/main.js']);
	}));
});

this.addEventListener('activate', function (event) {
	event.waitUntil(caches.keys().then(function (cacheNames) {
		return Promise.all(cacheNames.filter(function (cacheName) {
			return cacheName !== 'BART-transportation-data';
		}).map(function (cacheName) {
			console.log('Deleting ' + cacheName);
			return caches.delete(cacheName);
		}));
	}));
});

this.addEventListener('fetch', function (event) {
	event.respondWith(caches.match(event.request).then(function (resp) {
		if (resp) {
			return resp;
		}
		var fetchRequest = event.request.clone();
		return fetch(fetchRequest).then(function (resp) {
			if (!resp || resp.status !== 200) {
				return resp;
			}
			var responseToCache = resp.clone();
			caches.open('BART-transportation-data').then(function (cache) {
				cache.add(fetchRequest);
			});
			return resp;
		});
	}));
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzd0dldERhdGEuanMiXSwic291cmNlc0NvbnRlbnQiOlsidGhpcy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuXHQvLyBBdCBmaXJzdCwgbGV0J3MgY2hlY2sgaWYgd2UgaGF2ZSBwZXJtaXNzaW9uIGZvciBub3RpZmljYXRpb25cblx0Ly8gSWYgbm90LCBsZXQncyBhc2sgZm9yIGl0XG5cdGlmICh3aW5kb3cuTm90aWZpY2F0aW9uICYmIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uICE9PSBcImdyYW50ZWRcIikge1xuXHRcdE5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbihmdW5jdGlvbiAoc3RhdHVzKSB7XG5cdFx0XHRpZiAoTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gIT09IHN0YXR1cykge1xuXHRcdFx0XHROb3RpZmljYXRpb24ucGVybWlzc2lvbiA9IHN0YXR1cztcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG5cbnRoaXMuYWRkRXZlbnRMaXN0ZW5lcignaW5zdGFsbCcsIGZ1bmN0aW9uIChldmVudCkge1xuXHRldmVudC53YWl0VW50aWwoY2FjaGVzLm9wZW4oJ0JBUlQtdHJhbnNwb3J0YXRpb24tZGF0YScpLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XG5cdFx0cmV0dXJuIGNhY2hlLmFkZEFsbChbJy8nLCAnL2luZGV4Lmh0bWwnLCAnL1JFQURNRS5tZCcsICcvY3NzL21haW4uY3NzJywgJy9qcy9tYWluLmpzJ10pO1xuXHR9KSk7XG59KTtcblxudGhpcy5hZGRFdmVudExpc3RlbmVyKCdhY3RpdmF0ZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRldmVudC53YWl0VW50aWwoY2FjaGVzLmtleXMoKS50aGVuKGZ1bmN0aW9uIChjYWNoZU5hbWVzKSB7XG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKGNhY2hlTmFtZXMuZmlsdGVyKGZ1bmN0aW9uIChjYWNoZU5hbWUpIHtcblx0XHRcdHJldHVybiBjYWNoZU5hbWUgIT09ICdCQVJULXRyYW5zcG9ydGF0aW9uLWRhdGEnO1xuXHRcdH0pLm1hcChmdW5jdGlvbiAoY2FjaGVOYW1lKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRGVsZXRpbmcgJyArIGNhY2hlTmFtZSk7XG5cdFx0XHRyZXR1cm4gY2FjaGVzLmRlbGV0ZShjYWNoZU5hbWUpO1xuXHRcdH0pKTtcblx0fSkpO1xufSk7XG5cbnRoaXMuYWRkRXZlbnRMaXN0ZW5lcignZmV0Y2gnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ZXZlbnQucmVzcG9uZFdpdGgoY2FjaGVzLm1hdGNoKGV2ZW50LnJlcXVlc3QpLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcblx0XHRpZiAocmVzcCkge1xuXHRcdFx0cmV0dXJuIHJlc3A7XG5cdFx0fVxuXHRcdHZhciBmZXRjaFJlcXVlc3QgPSBldmVudC5yZXF1ZXN0LmNsb25lKCk7XG5cdFx0cmV0dXJuIGZldGNoKGZldGNoUmVxdWVzdCkudGhlbihmdW5jdGlvbiAocmVzcCkge1xuXHRcdFx0aWYgKCFyZXNwIHx8IHJlc3Auc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0cmV0dXJuIHJlc3A7XG5cdFx0XHR9XG5cdFx0XHR2YXIgcmVzcG9uc2VUb0NhY2hlID0gcmVzcC5jbG9uZSgpO1xuXHRcdFx0Y2FjaGVzLm9wZW4oJ0JBUlQtdHJhbnNwb3J0YXRpb24tZGF0YScpLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XG5cdFx0XHRcdGNhY2hlLmFkZChmZXRjaFJlcXVlc3QpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gcmVzcDtcblx0XHR9KTtcblx0fSkpO1xufSk7Il0sImZpbGUiOiJzd0dldERhdGEuanMifQ==
