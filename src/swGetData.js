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

this.addEventListener('install', function(event) {
	event.waitUntil(
		caches.open('BART-transportation-data').then(function(cache) {
			return cache.addAll([
				'/',
				'/index.html',
				'/README.md',
				'/css/main.css',
				'/js/main.js',
				'/img/map.gif'
			]);
		})
    );
});

this.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			return Promise.all(
				cacheNames.filter(function(cacheName) {
					return cacheName !== 'BART-transportation-data';
				}).map(function(cacheName) {
					console.log('Deleting '+ cacheName);
					return caches.delete(cacheName);
				})
			);
		})
	);
});

this.addEventListener('fetch', function(event) {
	event.respondWith(
		caches.match(event.request).then(function(resp) {
			if (resp) {
				return resp;
			}
			var fetchRequest = event.request.clone();
			return fetch(fetchRequest).then(function(resp) {
				if(!resp || resp.status !== 200) {
					return resp;
				}
				var responseToCache = resp.clone();
				caches.open('BART-transportation-data').then (function(cache) {
					cache.add(fetchRequest);
				});
				return resp;
			}).catch(function(error) {
				console.log('There has been a problem with your fetch operation: ' + error.message);
			});
		})
	);
});
