(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };

  document.getElementById('butRefresh').addEventListener('click', function() {
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var currency = selected.value;
    var label = selected.textContent;
    if (!app.selectedCities) {
      app.selectedCities = [];
    }
    app.getForecast(currency, label);
    app.selectedCities.push({currency: currency, label: label});
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    app.toggleAddDialog(false);
  });

  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };    

  app.updateForecastCard = function(data) {
    
    var dataLastUpdated = new Date(data.created);
    
    var card = app.visibleCards[data.currency];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.currency] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;
    card.querySelector('.current .exchange .value').textContent = data.rate;
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  app.getForecast = function(currency, label) {
    // get everything relative to GBP for the moment
    var basecurrency = "GBP";
    // can't use https :(
    var url = 'http://api.fixer.io/latest?base=' + basecurrency + '&symbols=' + currency

    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function updateFromCache(json) {
            
            results.label = app.getLabel(basecurrency, currency);
            results.created = json.query.created;
            results.basecurrency = basecurrency;
            results.currency = currency;
            results.rate = results.rates[currency];
            
            app.updateForecastCard(results);

          });
        }
      });
    }
    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          var results = response;
          results.currency = currency;
          // results.label = app.getLabel(basecurrency, currency);
          results.label = label;
          
          results.rate = results.rates[currency]
          
          results.created = response.created;
          app.updateForecastCard(results);
        }
      } else {
        app.updateForecastCard(initialWeatherForecast);
      }
    };
    request.open('GET', url);
    request.send();
  };

  app.getLabel = function(base, currency){
    return base + " to " + currency;
  }

  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  app.saveSelectedCities = function() {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };

  app.getIconClass = function(weatherCode) {
    weatherCode = parseInt(weatherCode);
        return 'clear-day';
  };

  var initialWeatherForecast = {
    created: '2016-07-22T01:00:00Z',
    basecurrency : "GBP",
    currency : "USD",
    label: app.getLabel("GBP", "USD"),
    rate :  1.23456
  };

  app.selectedCities = localStorage.selectedCities;
  if (app.selectedCities) {
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(function(city) {
      app.getForecast(city.currency, city.label);
      // app.getForecast(city.key, city.label);
    });
  } else {
    app.updateForecastCard(initialWeatherForecast);
    app.selectedCities = [
      {currency: initialWeatherForecast.currency, label: initialWeatherForecast.label}
    ];
    app.saveSelectedCities();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();