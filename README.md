# google-gig-cal

Gig Cal is a system for using a public google calendar as content for a website or other javascript abled front-end.

Follow these conventions on your google calendar:

1. By setting time-zone on google calendar events when it differs from the main calendar time-zone, Gig Cal is able to show the time in the time-zone local to event.  (e.g.  If you have a 6pm gig in London tomorrow, you may want your website to show 6pm rather than the time converted to the time-zone of the browser.)
2. By putting links and image links in the event description, Gig Cal can extract them to be injected as links or images on your website.

## Pre-requisites

Google APIs require an API key assigned to an APP ID.  Since you don't want to expose the API key on your front-end, we assume you have a server endpoint which retrieves the calendar data to be consumed on the front-end and you are fetching data from that endpoint.  As an alternative, if your calendar is relatively static, you can use your key to download the json response from Google and store it as a file on your front-end.  [Google API Reference here.](https://developers.google.com/workspace/guides/create-credentials)

## Getting started

### Installation

This library is distributed on `npm`. In order to add it as a dependency, run the following command:

```sh
$ npm install @dempseyc/gig-cal
```

### Usage

All options are optional.  The 'expand' method options argument is optional.  See default values.

```
import GigCal from "gig-cal";
// fetch and assign const response or import your static data
import response from "./test/testData.json";

// just an example, don't forget to use .getTime() to convert to milliseconds
const SixtyDaysLater = new Date();
SixtyDaysLater.setDate(SixtyDaysLater.getDate() + 60);

const options = {
  minTime: Date.now, // <number> UTC ms // default Date.now
  maxTime: SixtyDaysLater.getTime(), // <number> UTC ms // default now + 30 days
  maxItems: 50, // <number> // default 100, prevents recurring events from exploding the interface
  extractURLs: true, // <boolean> // default true // Vevent object will have urls property with array of URLs found in the description text
  extractImages: true, // <boolean> // default true // Vevent object will have images property with array of image URLs found in the description text
  timeZoneByEvent: true, // <boolean> // default true // displayDate property will be adjusted per event to timeZone entered in the calendar.  Setting false will yeild dates in browser timeZone.
  sortEarliest: true, // <boolean> // default true // array will be sorted by ascending startTimes, false will yeild reverse
}

const vEventsArray = GigCal.expand(response, options);

/* vEventsArray be like
[
  {
    // properties
  }
]
*/
```

## TODOS

add method to make html ?  ``GigCal.toHTML(GigCal.expand(response, options));``

add options for which properties to return, how to format date strings
