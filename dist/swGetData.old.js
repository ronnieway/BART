console.log('WORKER: executing.');

/* A version number is useful when updating the worker logic,
   allowing you to remove outdated cache entries during the update.
*/
var version = 'v1::';

/* These resources will be downloaded and cached by the service worker
   during the installation process. If any resource fails to be downloaded,
   then the service worker won't be installed either.
*/
var offlineFundamentals = ['/', '/index.html', '/README.md', '/css/main.css', '/js/main.js'];

/* The install event fires when the service worker is first installed.
   You can use this event to prepare the service worker to be able to serve
   files while visitors are offline.
*/
self.addEventListener("install", function (event) {
  console.log('WORKER: install event in progress.');
  /* Using event.waitUntil(p) blocks the installation process on the provided
     promise. If the promise is rejected, the service worker won't be installed.
  */
  event.waitUntil(
  /* The caches built-in is a promise-based API that helps you cache responses,
     as well as finding and deleting them.
  */
  caches
  /* You can open a cache by name, and this method returns a promise. We use
     a versioned cache name here so that we can remove old cache entries in
     one fell swoop later, when phasing out an older service worker.
  */
  .open(version + ' BART-transportation-data').then(function (cache) {
    /* After the cache is opened, we can fill it with the offline fundamentals.
       The method below will add all resources in `offlineFundamentals` to the
       cache, after making requests for them.
    */
    return cache.addAll(offlineFundamentals);
  }).then(function () {
    console.log('WORKER: install completed');
  }));
});

/* The fetch event fires whenever a page controlled by this service worker requests
   a resource. This isn't limited to `fetch` or even XMLHttpRequest. Instead, it
   comprehends even the request for the HTML page on first load, as well as JS and
   CSS resources, fonts, any images, etc.
*/
self.addEventListener("fetch", function (event) {
  console.log('WORKER: fetch event in progress.');

  /* We should only cache GET requests, and deal with the rest of method in the
     client-side, by handling failed POST,PUT,PATCH,etc. requests.
  */
  if (event.request.method !== 'GET') {
    /* If we don't block the event as shown below, then the request will go to
       the network as usual.
    */
    console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
    return;
  }
  /* Similar to event.waitUntil in that it blocks the fetch event on a promise.
     Fulfillment result will be used as the response, and rejection will end in a
     HTTP response indicating failure.
  */
  event.respondWith(caches
  /* This method returns a promise that resolves to a cache entry matching
     the request. Once the promise is settled, we can then provide a response
     to the fetch request.
  */
  .match(event.request).then(function (cached) {
    /* Even if the response is in our cache, we go to the network as well.
       This pattern is known for producing "eventually fresh" responses,
       where we return cached responses immediately, and meanwhile pull
       a network response and store that in the cache.
       Read more:
       https://ponyfoo.com/articles/progressive-networking-serviceworker
    */
    var networked = fetch(event.request)
    // We handle the network request with success and failure scenarios.
    .then(fetchedFromNetwork, unableToResolve)
    // We should catch errors on the fetchedFromNetwork handler as well.
    .catch(unableToResolve);

    /* We return the cached response immediately if there is one, and fall
       back to waiting on the network as usual.
    */
    console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);
    return cached || networked;

    function fetchedFromNetwork(response) {
      /* We copy the response before replying to the network request.
         This is the response that will be stored on the ServiceWorker cache.
      */
      var cacheCopy = response.clone();

      console.log('WORKER: fetch response from network.', event.request.url);

      caches
      // We open a cache to store the response for this request.
      .open(version + ' BART-transportation-data').then(function add(cache) {
        /* We store the response for this request. It'll later become
           available to caches.match(event.request) calls, when looking
           for cached responses.
        */
        cache.add(event.request);
      }).then(function () {
        console.log('WORKER: fetch response stored in cache.', event.request.url);
      });

      // Return the response so that the promise is settled in fulfillment.
      return response;
    }

    /* When this method is called, it means we were unable to produce a response
       from either the cache or the network. This is our opportunity to produce
       a meaningful response even when all else fails. It's the last chance, so
       you probably want to display a "Service Unavailable" view or a generic
       error response.
    */
    function unableToResolve() {
      /* There's a couple of things we can do here.
         - Test the Accept header and then return one of the `offlineFundamentals`
           e.g: `return caches.match('/some/cached/image.png')`
         - You should also consider the origin. It's easier to decide what
           "unavailable" means for requests against your origins than for requests
           against a third party, such as an ad provider.
         - Generate a Response programmaticaly, as shown below, and return that.
      */

      console.log('WORKER: fetch request failed in both cache and network.');

      /* Here we're creating a response programmatically. The first parameter is the
         response body, and the second one defines the options for the response.
      */
      return new Response('<h1>Service Unavailable</h1>', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/html'
        })
      });
    }
  }));
});

/* The activate event fires after a service worker has been successfully installed.
   It is most useful when phasing out an older version of a service worker, as at
   this point you know that the new worker was installed correctly. In this example,
   we delete old caches that don't match the version in the worker we just finished
   installing.
*/
self.addEventListener("activate", function (event) {
  /* Just like with the install event, event.waitUntil blocks activate on a promise.
     Activation will fail unless the promise is fulfilled.
  */
  console.log('WORKER: activate event in progress.');

  event.waitUntil(caches
  /* This method returns a promise which will resolve to an array of available
     cache keys.
  */
  .keys().then(function (keys) {
    // We return a promise that settles when all outdated caches are deleted.
    return Promise.all(keys.filter(function (key) {
      // Filter by keys that don't start with the latest version prefix.
      return !key.startsWith(version);
    }).map(function (key) {
      /* Return a promise that's fulfilled
         when each outdated cache is deleted.
      */
      return caches.delete(key);
    }));
  }).then(function () {
    console.log('WORKER: activate completed.');
  }));
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzd0dldERhdGEub2xkLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnNvbGUubG9nKCdXT1JLRVI6IGV4ZWN1dGluZy4nKTtcblxuLyogQSB2ZXJzaW9uIG51bWJlciBpcyB1c2VmdWwgd2hlbiB1cGRhdGluZyB0aGUgd29ya2VyIGxvZ2ljLFxyXG4gICBhbGxvd2luZyB5b3UgdG8gcmVtb3ZlIG91dGRhdGVkIGNhY2hlIGVudHJpZXMgZHVyaW5nIHRoZSB1cGRhdGUuXHJcbiovXG52YXIgdmVyc2lvbiA9ICd2MTo6JztcblxuLyogVGhlc2UgcmVzb3VyY2VzIHdpbGwgYmUgZG93bmxvYWRlZCBhbmQgY2FjaGVkIGJ5IHRoZSBzZXJ2aWNlIHdvcmtlclxyXG4gICBkdXJpbmcgdGhlIGluc3RhbGxhdGlvbiBwcm9jZXNzLiBJZiBhbnkgcmVzb3VyY2UgZmFpbHMgdG8gYmUgZG93bmxvYWRlZCxcclxuICAgdGhlbiB0aGUgc2VydmljZSB3b3JrZXIgd29uJ3QgYmUgaW5zdGFsbGVkIGVpdGhlci5cclxuKi9cbnZhciBvZmZsaW5lRnVuZGFtZW50YWxzID0gWycvJywgJy9pbmRleC5odG1sJywgJy9SRUFETUUubWQnLCAnL2Nzcy9tYWluLmNzcycsICcvanMvbWFpbi5qcyddO1xuXG4vKiBUaGUgaW5zdGFsbCBldmVudCBmaXJlcyB3aGVuIHRoZSBzZXJ2aWNlIHdvcmtlciBpcyBmaXJzdCBpbnN0YWxsZWQuXHJcbiAgIFlvdSBjYW4gdXNlIHRoaXMgZXZlbnQgdG8gcHJlcGFyZSB0aGUgc2VydmljZSB3b3JrZXIgdG8gYmUgYWJsZSB0byBzZXJ2ZVxyXG4gICBmaWxlcyB3aGlsZSB2aXNpdG9ycyBhcmUgb2ZmbGluZS5cclxuKi9cbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImluc3RhbGxcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gIGNvbnNvbGUubG9nKCdXT1JLRVI6IGluc3RhbGwgZXZlbnQgaW4gcHJvZ3Jlc3MuJyk7XG4gIC8qIFVzaW5nIGV2ZW50LndhaXRVbnRpbChwKSBibG9ja3MgdGhlIGluc3RhbGxhdGlvbiBwcm9jZXNzIG9uIHRoZSBwcm92aWRlZFxyXG4gICAgIHByb21pc2UuIElmIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkLCB0aGUgc2VydmljZSB3b3JrZXIgd29uJ3QgYmUgaW5zdGFsbGVkLlxyXG4gICovXG4gIGV2ZW50LndhaXRVbnRpbChcbiAgLyogVGhlIGNhY2hlcyBidWlsdC1pbiBpcyBhIHByb21pc2UtYmFzZWQgQVBJIHRoYXQgaGVscHMgeW91IGNhY2hlIHJlc3BvbnNlcyxcclxuICAgICBhcyB3ZWxsIGFzIGZpbmRpbmcgYW5kIGRlbGV0aW5nIHRoZW0uXHJcbiAgKi9cbiAgY2FjaGVzXG4gIC8qIFlvdSBjYW4gb3BlbiBhIGNhY2hlIGJ5IG5hbWUsIGFuZCB0aGlzIG1ldGhvZCByZXR1cm5zIGEgcHJvbWlzZS4gV2UgdXNlXHJcbiAgICAgYSB2ZXJzaW9uZWQgY2FjaGUgbmFtZSBoZXJlIHNvIHRoYXQgd2UgY2FuIHJlbW92ZSBvbGQgY2FjaGUgZW50cmllcyBpblxyXG4gICAgIG9uZSBmZWxsIHN3b29wIGxhdGVyLCB3aGVuIHBoYXNpbmcgb3V0IGFuIG9sZGVyIHNlcnZpY2Ugd29ya2VyLlxyXG4gICovXG4gIC5vcGVuKHZlcnNpb24gKyAnIEJBUlQtdHJhbnNwb3J0YXRpb24tZGF0YScpLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XG4gICAgLyogQWZ0ZXIgdGhlIGNhY2hlIGlzIG9wZW5lZCwgd2UgY2FuIGZpbGwgaXQgd2l0aCB0aGUgb2ZmbGluZSBmdW5kYW1lbnRhbHMuXHJcbiAgICAgICBUaGUgbWV0aG9kIGJlbG93IHdpbGwgYWRkIGFsbCByZXNvdXJjZXMgaW4gYG9mZmxpbmVGdW5kYW1lbnRhbHNgIHRvIHRoZVxyXG4gICAgICAgY2FjaGUsIGFmdGVyIG1ha2luZyByZXF1ZXN0cyBmb3IgdGhlbS5cclxuICAgICovXG4gICAgcmV0dXJuIGNhY2hlLmFkZEFsbChvZmZsaW5lRnVuZGFtZW50YWxzKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ1dPUktFUjogaW5zdGFsbCBjb21wbGV0ZWQnKTtcbiAgfSkpO1xufSk7XG5cbi8qIFRoZSBmZXRjaCBldmVudCBmaXJlcyB3aGVuZXZlciBhIHBhZ2UgY29udHJvbGxlZCBieSB0aGlzIHNlcnZpY2Ugd29ya2VyIHJlcXVlc3RzXHJcbiAgIGEgcmVzb3VyY2UuIFRoaXMgaXNuJ3QgbGltaXRlZCB0byBgZmV0Y2hgIG9yIGV2ZW4gWE1MSHR0cFJlcXVlc3QuIEluc3RlYWQsIGl0XHJcbiAgIGNvbXByZWhlbmRzIGV2ZW4gdGhlIHJlcXVlc3QgZm9yIHRoZSBIVE1MIHBhZ2Ugb24gZmlyc3QgbG9hZCwgYXMgd2VsbCBhcyBKUyBhbmRcclxuICAgQ1NTIHJlc291cmNlcywgZm9udHMsIGFueSBpbWFnZXMsIGV0Yy5cclxuKi9cbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImZldGNoXCIsIGZ1bmN0aW9uIChldmVudCkge1xuICBjb25zb2xlLmxvZygnV09SS0VSOiBmZXRjaCBldmVudCBpbiBwcm9ncmVzcy4nKTtcblxuICAvKiBXZSBzaG91bGQgb25seSBjYWNoZSBHRVQgcmVxdWVzdHMsIGFuZCBkZWFsIHdpdGggdGhlIHJlc3Qgb2YgbWV0aG9kIGluIHRoZVxyXG4gICAgIGNsaWVudC1zaWRlLCBieSBoYW5kbGluZyBmYWlsZWQgUE9TVCxQVVQsUEFUQ0gsZXRjLiByZXF1ZXN0cy5cclxuICAqL1xuICBpZiAoZXZlbnQucmVxdWVzdC5tZXRob2QgIT09ICdHRVQnKSB7XG4gICAgLyogSWYgd2UgZG9uJ3QgYmxvY2sgdGhlIGV2ZW50IGFzIHNob3duIGJlbG93LCB0aGVuIHRoZSByZXF1ZXN0IHdpbGwgZ28gdG9cclxuICAgICAgIHRoZSBuZXR3b3JrIGFzIHVzdWFsLlxyXG4gICAgKi9cbiAgICBjb25zb2xlLmxvZygnV09SS0VSOiBmZXRjaCBldmVudCBpZ25vcmVkLicsIGV2ZW50LnJlcXVlc3QubWV0aG9kLCBldmVudC5yZXF1ZXN0LnVybCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8qIFNpbWlsYXIgdG8gZXZlbnQud2FpdFVudGlsIGluIHRoYXQgaXQgYmxvY2tzIHRoZSBmZXRjaCBldmVudCBvbiBhIHByb21pc2UuXHJcbiAgICAgRnVsZmlsbG1lbnQgcmVzdWx0IHdpbGwgYmUgdXNlZCBhcyB0aGUgcmVzcG9uc2UsIGFuZCByZWplY3Rpb24gd2lsbCBlbmQgaW4gYVxyXG4gICAgIEhUVFAgcmVzcG9uc2UgaW5kaWNhdGluZyBmYWlsdXJlLlxyXG4gICovXG4gIGV2ZW50LnJlc3BvbmRXaXRoKGNhY2hlc1xuICAvKiBUaGlzIG1ldGhvZCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGEgY2FjaGUgZW50cnkgbWF0Y2hpbmdcclxuICAgICB0aGUgcmVxdWVzdC4gT25jZSB0aGUgcHJvbWlzZSBpcyBzZXR0bGVkLCB3ZSBjYW4gdGhlbiBwcm92aWRlIGEgcmVzcG9uc2VcclxuICAgICB0byB0aGUgZmV0Y2ggcmVxdWVzdC5cclxuICAqL1xuICAubWF0Y2goZXZlbnQucmVxdWVzdCkudGhlbihmdW5jdGlvbiAoY2FjaGVkKSB7XG4gICAgLyogRXZlbiBpZiB0aGUgcmVzcG9uc2UgaXMgaW4gb3VyIGNhY2hlLCB3ZSBnbyB0byB0aGUgbmV0d29yayBhcyB3ZWxsLlxyXG4gICAgICAgVGhpcyBwYXR0ZXJuIGlzIGtub3duIGZvciBwcm9kdWNpbmcgXCJldmVudHVhbGx5IGZyZXNoXCIgcmVzcG9uc2VzLFxyXG4gICAgICAgd2hlcmUgd2UgcmV0dXJuIGNhY2hlZCByZXNwb25zZXMgaW1tZWRpYXRlbHksIGFuZCBtZWFud2hpbGUgcHVsbFxyXG4gICAgICAgYSBuZXR3b3JrIHJlc3BvbnNlIGFuZCBzdG9yZSB0aGF0IGluIHRoZSBjYWNoZS5cclxuICAgICAgIFJlYWQgbW9yZTpcclxuICAgICAgIGh0dHBzOi8vcG9ueWZvby5jb20vYXJ0aWNsZXMvcHJvZ3Jlc3NpdmUtbmV0d29ya2luZy1zZXJ2aWNld29ya2VyXHJcbiAgICAqL1xuICAgIHZhciBuZXR3b3JrZWQgPSBmZXRjaChldmVudC5yZXF1ZXN0KVxuICAgIC8vIFdlIGhhbmRsZSB0aGUgbmV0d29yayByZXF1ZXN0IHdpdGggc3VjY2VzcyBhbmQgZmFpbHVyZSBzY2VuYXJpb3MuXG4gICAgLnRoZW4oZmV0Y2hlZEZyb21OZXR3b3JrLCB1bmFibGVUb1Jlc29sdmUpXG4gICAgLy8gV2Ugc2hvdWxkIGNhdGNoIGVycm9ycyBvbiB0aGUgZmV0Y2hlZEZyb21OZXR3b3JrIGhhbmRsZXIgYXMgd2VsbC5cbiAgICAuY2F0Y2godW5hYmxlVG9SZXNvbHZlKTtcblxuICAgIC8qIFdlIHJldHVybiB0aGUgY2FjaGVkIHJlc3BvbnNlIGltbWVkaWF0ZWx5IGlmIHRoZXJlIGlzIG9uZSwgYW5kIGZhbGxcclxuICAgICAgIGJhY2sgdG8gd2FpdGluZyBvbiB0aGUgbmV0d29yayBhcyB1c3VhbC5cclxuICAgICovXG4gICAgY29uc29sZS5sb2coJ1dPUktFUjogZmV0Y2ggZXZlbnQnLCBjYWNoZWQgPyAnKGNhY2hlZCknIDogJyhuZXR3b3JrKScsIGV2ZW50LnJlcXVlc3QudXJsKTtcbiAgICByZXR1cm4gY2FjaGVkIHx8IG5ldHdvcmtlZDtcblxuICAgIGZ1bmN0aW9uIGZldGNoZWRGcm9tTmV0d29yayhyZXNwb25zZSkge1xuICAgICAgLyogV2UgY29weSB0aGUgcmVzcG9uc2UgYmVmb3JlIHJlcGx5aW5nIHRvIHRoZSBuZXR3b3JrIHJlcXVlc3QuXHJcbiAgICAgICAgIFRoaXMgaXMgdGhlIHJlc3BvbnNlIHRoYXQgd2lsbCBiZSBzdG9yZWQgb24gdGhlIFNlcnZpY2VXb3JrZXIgY2FjaGUuXHJcbiAgICAgICovXG4gICAgICB2YXIgY2FjaGVDb3B5ID0gcmVzcG9uc2UuY2xvbmUoKTtcblxuICAgICAgY29uc29sZS5sb2coJ1dPUktFUjogZmV0Y2ggcmVzcG9uc2UgZnJvbSBuZXR3b3JrLicsIGV2ZW50LnJlcXVlc3QudXJsKTtcblxuICAgICAgY2FjaGVzXG4gICAgICAvLyBXZSBvcGVuIGEgY2FjaGUgdG8gc3RvcmUgdGhlIHJlc3BvbnNlIGZvciB0aGlzIHJlcXVlc3QuXG4gICAgICAub3Blbih2ZXJzaW9uICsgJyBCQVJULXRyYW5zcG9ydGF0aW9uLWRhdGEnKS50aGVuKGZ1bmN0aW9uIGFkZChjYWNoZSkge1xuICAgICAgICAvKiBXZSBzdG9yZSB0aGUgcmVzcG9uc2UgZm9yIHRoaXMgcmVxdWVzdC4gSXQnbGwgbGF0ZXIgYmVjb21lXHJcbiAgICAgICAgICAgYXZhaWxhYmxlIHRvIGNhY2hlcy5tYXRjaChldmVudC5yZXF1ZXN0KSBjYWxscywgd2hlbiBsb29raW5nXHJcbiAgICAgICAgICAgZm9yIGNhY2hlZCByZXNwb25zZXMuXHJcbiAgICAgICAgKi9cbiAgICAgICAgY2FjaGUuYWRkKGV2ZW50LnJlcXVlc3QpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdXT1JLRVI6IGZldGNoIHJlc3BvbnNlIHN0b3JlZCBpbiBjYWNoZS4nLCBldmVudC5yZXF1ZXN0LnVybCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gUmV0dXJuIHRoZSByZXNwb25zZSBzbyB0aGF0IHRoZSBwcm9taXNlIGlzIHNldHRsZWQgaW4gZnVsZmlsbG1lbnQuXG4gICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuXG4gICAgLyogV2hlbiB0aGlzIG1ldGhvZCBpcyBjYWxsZWQsIGl0IG1lYW5zIHdlIHdlcmUgdW5hYmxlIHRvIHByb2R1Y2UgYSByZXNwb25zZVxyXG4gICAgICAgZnJvbSBlaXRoZXIgdGhlIGNhY2hlIG9yIHRoZSBuZXR3b3JrLiBUaGlzIGlzIG91ciBvcHBvcnR1bml0eSB0byBwcm9kdWNlXHJcbiAgICAgICBhIG1lYW5pbmdmdWwgcmVzcG9uc2UgZXZlbiB3aGVuIGFsbCBlbHNlIGZhaWxzLiBJdCdzIHRoZSBsYXN0IGNoYW5jZSwgc29cclxuICAgICAgIHlvdSBwcm9iYWJseSB3YW50IHRvIGRpc3BsYXkgYSBcIlNlcnZpY2UgVW5hdmFpbGFibGVcIiB2aWV3IG9yIGEgZ2VuZXJpY1xyXG4gICAgICAgZXJyb3IgcmVzcG9uc2UuXHJcbiAgICAqL1xuICAgIGZ1bmN0aW9uIHVuYWJsZVRvUmVzb2x2ZSgpIHtcbiAgICAgIC8qIFRoZXJlJ3MgYSBjb3VwbGUgb2YgdGhpbmdzIHdlIGNhbiBkbyBoZXJlLlxyXG4gICAgICAgICAtIFRlc3QgdGhlIEFjY2VwdCBoZWFkZXIgYW5kIHRoZW4gcmV0dXJuIG9uZSBvZiB0aGUgYG9mZmxpbmVGdW5kYW1lbnRhbHNgXHJcbiAgICAgICAgICAgZS5nOiBgcmV0dXJuIGNhY2hlcy5tYXRjaCgnL3NvbWUvY2FjaGVkL2ltYWdlLnBuZycpYFxyXG4gICAgICAgICAtIFlvdSBzaG91bGQgYWxzbyBjb25zaWRlciB0aGUgb3JpZ2luLiBJdCdzIGVhc2llciB0byBkZWNpZGUgd2hhdFxyXG4gICAgICAgICAgIFwidW5hdmFpbGFibGVcIiBtZWFucyBmb3IgcmVxdWVzdHMgYWdhaW5zdCB5b3VyIG9yaWdpbnMgdGhhbiBmb3IgcmVxdWVzdHNcclxuICAgICAgICAgICBhZ2FpbnN0IGEgdGhpcmQgcGFydHksIHN1Y2ggYXMgYW4gYWQgcHJvdmlkZXIuXHJcbiAgICAgICAgIC0gR2VuZXJhdGUgYSBSZXNwb25zZSBwcm9ncmFtbWF0aWNhbHksIGFzIHNob3duIGJlbG93LCBhbmQgcmV0dXJuIHRoYXQuXHJcbiAgICAgICovXG5cbiAgICAgIGNvbnNvbGUubG9nKCdXT1JLRVI6IGZldGNoIHJlcXVlc3QgZmFpbGVkIGluIGJvdGggY2FjaGUgYW5kIG5ldHdvcmsuJyk7XG5cbiAgICAgIC8qIEhlcmUgd2UncmUgY3JlYXRpbmcgYSByZXNwb25zZSBwcm9ncmFtbWF0aWNhbGx5LiBUaGUgZmlyc3QgcGFyYW1ldGVyIGlzIHRoZVxyXG4gICAgICAgICByZXNwb25zZSBib2R5LCBhbmQgdGhlIHNlY29uZCBvbmUgZGVmaW5lcyB0aGUgb3B0aW9ucyBmb3IgdGhlIHJlc3BvbnNlLlxyXG4gICAgICAqL1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZSgnPGgxPlNlcnZpY2UgVW5hdmFpbGFibGU8L2gxPicsIHtcbiAgICAgICAgc3RhdHVzOiA1MDMsXG4gICAgICAgIHN0YXR1c1RleHQ6ICdTZXJ2aWNlIFVuYXZhaWxhYmxlJyxcbiAgICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnMoe1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9odG1sJ1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgfVxuICB9KSk7XG59KTtcblxuLyogVGhlIGFjdGl2YXRlIGV2ZW50IGZpcmVzIGFmdGVyIGEgc2VydmljZSB3b3JrZXIgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IGluc3RhbGxlZC5cclxuICAgSXQgaXMgbW9zdCB1c2VmdWwgd2hlbiBwaGFzaW5nIG91dCBhbiBvbGRlciB2ZXJzaW9uIG9mIGEgc2VydmljZSB3b3JrZXIsIGFzIGF0XHJcbiAgIHRoaXMgcG9pbnQgeW91IGtub3cgdGhhdCB0aGUgbmV3IHdvcmtlciB3YXMgaW5zdGFsbGVkIGNvcnJlY3RseS4gSW4gdGhpcyBleGFtcGxlLFxyXG4gICB3ZSBkZWxldGUgb2xkIGNhY2hlcyB0aGF0IGRvbid0IG1hdGNoIHRoZSB2ZXJzaW9uIGluIHRoZSB3b3JrZXIgd2UganVzdCBmaW5pc2hlZFxyXG4gICBpbnN0YWxsaW5nLlxyXG4qL1xuc2VsZi5hZGRFdmVudExpc3RlbmVyKFwiYWN0aXZhdGVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gIC8qIEp1c3QgbGlrZSB3aXRoIHRoZSBpbnN0YWxsIGV2ZW50LCBldmVudC53YWl0VW50aWwgYmxvY2tzIGFjdGl2YXRlIG9uIGEgcHJvbWlzZS5cclxuICAgICBBY3RpdmF0aW9uIHdpbGwgZmFpbCB1bmxlc3MgdGhlIHByb21pc2UgaXMgZnVsZmlsbGVkLlxyXG4gICovXG4gIGNvbnNvbGUubG9nKCdXT1JLRVI6IGFjdGl2YXRlIGV2ZW50IGluIHByb2dyZXNzLicpO1xuXG4gIGV2ZW50LndhaXRVbnRpbChjYWNoZXNcbiAgLyogVGhpcyBtZXRob2QgcmV0dXJucyBhIHByb21pc2Ugd2hpY2ggd2lsbCByZXNvbHZlIHRvIGFuIGFycmF5IG9mIGF2YWlsYWJsZVxyXG4gICAgIGNhY2hlIGtleXMuXHJcbiAgKi9cbiAgLmtleXMoKS50aGVuKGZ1bmN0aW9uIChrZXlzKSB7XG4gICAgLy8gV2UgcmV0dXJuIGEgcHJvbWlzZSB0aGF0IHNldHRsZXMgd2hlbiBhbGwgb3V0ZGF0ZWQgY2FjaGVzIGFyZSBkZWxldGVkLlxuICAgIHJldHVybiBQcm9taXNlLmFsbChrZXlzLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAvLyBGaWx0ZXIgYnkga2V5cyB0aGF0IGRvbid0IHN0YXJ0IHdpdGggdGhlIGxhdGVzdCB2ZXJzaW9uIHByZWZpeC5cbiAgICAgIHJldHVybiAha2V5LnN0YXJ0c1dpdGgodmVyc2lvbik7XG4gICAgfSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIC8qIFJldHVybiBhIHByb21pc2UgdGhhdCdzIGZ1bGZpbGxlZFxyXG4gICAgICAgICB3aGVuIGVhY2ggb3V0ZGF0ZWQgY2FjaGUgaXMgZGVsZXRlZC5cclxuICAgICAgKi9cbiAgICAgIHJldHVybiBjYWNoZXMuZGVsZXRlKGtleSk7XG4gICAgfSkpO1xuICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmxvZygnV09SS0VSOiBhY3RpdmF0ZSBjb21wbGV0ZWQuJyk7XG4gIH0pKTtcbn0pOyJdLCJmaWxlIjoic3dHZXREYXRhLm9sZC5qcyJ9
