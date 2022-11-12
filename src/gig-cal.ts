import { RRule } from "rrule";

type ResponseType = {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  defaultReminders: never[];
  nextSyncToken: string;
  items: any[];
}

let outputObject: any[] = [];

const NOW = Date.now();

const NOW_PLUS_30_DAYS = new Date();
NOW_PLUS_30_DAYS.setDate(NOW_PLUS_30_DAYS.getDate() + 30);

export type OptionsType = {
  minTime?: number | undefined; //UTC ms
  maxTime?: number; // UTC ms // default now + 30 days
  maxItems?: number; // default 100; prevents recurring events from exploding the interface
  extractURLs?: boolean; // <boolean> // default true // Vevent object will have urls property with array of URLs found in the description text
  extractImages?: boolean; // <boolean> // default true // Vevent object will have images property with array of image URLs found in the description text
  timeZoneByEvent?: boolean; // <boolean> // default true // displayDate property will be adjusted per event to timeZone entered in the calendar.  Setting false will yeild dates in browser timeZone.
  sortEarliest?: boolean; // <boolean> // default true // array will be sorted by ascending startTimes, false will yeild reverse
}

const defaultOptions: OptionsType = {
  minTime: NOW, //UTC ms
  maxTime: NOW_PLUS_30_DAYS.getTime(), // UTC ms
  maxItems: 100, // default 100, prevents recurring events from exploding the interface
  extractURLs: true, // <boolean> // default true // Vevent object will have urls property with array of URLs found in the description text
  extractImages: true, // <boolean> // default true // Vevent object will have images property with array of image URLs found in the description text
  timeZoneByEvent: true, // <boolean> // default true // displayDate property will be adjusted per event to timeZone entered in the calendar.  Setting false will yeild dates in browser timeZone.
  sortEarliest: true,
}

type VEventType = {
  id: string;
  htmlLink: string;
  summary: string;
  description: string;
  start: {date: string} | {dateTime: string, timeZone: string};
  end: {date: string} | {dateTime: string, timeZone: string};
}

export class GigCal {
  static expand(response: ResponseType, options: OptionsType = defaultOptions) {
    if (options) {
      options = { ...defaultOptions, ...options };
    }
    outputObject = this._applyRRule(response,options);
    return outputObject;
  }

  static _applyRRule (response: ResponseType, options: OptionsType) {
    return response.items;
  }

}

// facts: 
//// id is different for a recurred event that's changed---appends date
//// 
// exampleEvents
const example1 = {
  "kind": "calendar#event",
  "etag": "\"3316915795678000\"",
  "id": "1pg1flt62edvv544bot05tugbb",
  "status": "confirmed",
  "htmlLink": "https://www.google.com/calendar/event?eid=MXBnMWZsdDYyZWR2djU0NGJvdDA1dHVnYmJfMjAyMjA5MDYgMTNsamp1dmo4MDE3aWxvOTBlNmZydHU4ZWtAZw",
  "created": "2022-07-22T02:44:57.000Z",
  "updated": "2022-07-22T02:44:57.839Z",
  "summary": "test 3 recur * 4 last occ after lfd",
  "description": "should test false",
  "creator": {
   "email": "craigdempsey@gmail.com"
  },
  "organizer": {
   "email": "13ljjuvj8017ilo90e6frtu8ek@group.calendar.google.com",
   "displayName": "craig public test",
   "self": true
  },
  "start": {
   "date": "2022-09-06"
  },
  "end": {
   "date": "2022-09-07"
  },
  "recurrence": [
   "RRULE:FREQ=WEEKLY;WKST=SU;COUNT=4;BYDAY=TU"
  ],
  "transparency": "transparent",
  "iCalUID": "1pg1flt62edvv544bot05tugbb@google.com",
  "sequence": 0,
  "eventType": "default"
 };
 const example2 = 
 {
  "kind": "calendar#event",
  "etag": "\"3316916242836000\"",
  "id": "35r46qa2m9fpbr5649vvqljfdk",
  "status": "confirmed",
  "htmlLink": "https://www.google.com/calendar/event?eid=MzVyNDZxYTJtOWZwYnI1NjQ5dnZxbGpmZGtfMjAyMjA3MjJUMDAwMDAwWiAxM2xqanV2ajgwMTdpbG85MGU2ZnJ0dThla0Bn",
  "created": "2022-07-22T02:47:23.000Z",
  "updated": "2022-07-22T02:48:41.418Z",
  "summary": "test 4 recurr 4x 2 in range",
  "description": "test true *2",
  "creator": {
   "email": "craigdempsey@gmail.com"
  },
  "organizer": {
   "email": "13ljjuvj8017ilo90e6frtu8ek@group.calendar.google.com",
   "displayName": "craig public test",
   "self": true
  },
  "start": {
   "dateTime": "2022-07-21T20:00:00-04:00",
   "timeZone": "America/New_York"
  },
  "end": {
   "dateTime": "2022-07-21T21:00:00-04:00",
   "timeZone": "America/New_York"
  },
  "recurrence": [
   "RRULE:FREQ=WEEKLY;WKST=SU;UNTIL=20220813T035959Z;BYDAY=TH"
  ],
  "iCalUID": "35r46qa2m9fpbr5649vvqljfdk@google.com",
  "sequence": 1,
  "eventType": "default"
 };
