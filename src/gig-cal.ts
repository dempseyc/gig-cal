import { RRule, rrulestr } from "rrule";

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
};

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
};

const defaultOptions: OptionsType = {
  minTime: NOW, //UTC ms
  maxTime: NOW_PLUS_30_DAYS.getTime(), // UTC ms
  maxItems: 100, // default 100, prevents recurring events from exploding the interface
  extractURLs: true, // <boolean> // default true // Vevent object will have urls property with array of URLs found in the description text
  extractImages: true, // <boolean> // default true // Vevent object will have images property with array of image URLs found in the description text
  timeZoneByEvent: true, // <boolean> // default true // displayDate property will be adjusted per event to timeZone entered in the calendar.  Setting false will yeild dates in browser timeZone.
  sortEarliest: true,
};

// minimize data option
type VEventType = {
  id: string;
  // htmlLink: string;
  summary: string;
  description: string;
  start: { date: string } | { dateTime: string; timeZone: string };
  end: { date: string } | { dateTime: string; timeZone: string };
  startInLocaleString: string;
};

// return ICS format to be consumed by RRULE, given "2022-08-02T01:30:00.000Z" returns "20220802T013000Z"
const trimISOdate = (ISOstr: string) => {
  const arr = ISOstr.split("");
  const filtered = arr.filter(
    (_, i) => ![4, 7, 13, 16, 19, 20, 21, 22].includes(i)
  );
  return filtered.join("");
};

export const exportForTesting = {
  trimISOdate,
};

let outputObject: any[] = [];
let usedIDs: string[] = [];

export class GigCal {
  static expand(response: ResponseType, options: OptionsType = defaultOptions) {
    if (options) {
      if (options.minTime && !options.maxTime) {
        let minTime_PLUS_30_days = new Date(options.minTime);
        minTime_PLUS_30_days.setDate(minTime_PLUS_30_days.getDate() + 30);
        options.maxTime = minTime_PLUS_30_days.getTime();
      }
      options = Object.assign(defaultOptions, options);
    }
    outputObject = response.items;
    outputObject = this._filterNoRRuleNotInTimespan(outputObject, options);
    outputObject = this._replaceDatesWithISOstring(outputObject, options);
    outputObject = this._applyRRules(outputObject, options);
    outputObject = this._extractOccasions(outputObject, options);
    outputObject = this._addMetadata(outputObject, options);
    outputObject = this._minimizeData(outputObject, options);
    return outputObject;
  }

  static _filterNoRRuleNotInTimespan(
    eventDataArray: any[],
    options: OptionsType
  ) {
    let arrayMinusNotInTimespan: any[] = eventDataArray.filter((eventData) => {
      const start = new Date(eventData.start.dateTime || eventData.start.date);
      if (
        (start.getTime() < options.minTime! ||
          start.getTime() > options.maxTime!) &&
        !eventData.recurrence
      ) {
        return false;
      }
      return true;
    });
    return arrayMinusNotInTimespan;
  }

  static _replaceDatesWithISOstring(
    eventDataArray: any[],
    options: OptionsType
  ) {
    const convertToISOString = (date: string) => {
      const newDate = new Date(date);
      const string = newDate.toISOString();
      return string;
    };
    return eventDataArray.map((eventData) => {
      eventData.start.dateTime = convertToISOString(
        eventData.start.dateTime || eventData.start.date
      );
      eventData.end.dateTime = convertToISOString(
        eventData.end.dateTime || eventData.end.date
      );
      return eventData;
    });
  }

  static _applyRRules(eventDataArray: any[], options: OptionsType) {
    const makeOccurrences = (eventData: any, options: OptionsType) => {
      let DTSTART = new Date(
        Date.parse(eventData.start.dateTime || eventData.start.date)
      ).toISOString();
      DTSTART = trimISOdate(DTSTART);
      const ICS_STRING = "DTSTART:" + DTSTART + "\n" + eventData.recurrence[0];
      const ruleObj = rrulestr(ICS_STRING);
      const occurrences = ruleObj.between(
        new Date(options.minTime!),
        new Date(options.maxTime!)
      );
      return { ...eventData, occurrences };
    }; // makeOccurrences

    const arrayWithOccurrences = eventDataArray.map((eventData) => {
      if (eventData.recurrence) {
        return makeOccurrences(eventData, options);
      }
      if (eventData.recurringEventId) {
        usedIDs.push(eventData.id);
      }
      return eventData;
    });

    const arrayMinusNoOccurenceInTimespan = arrayWithOccurrences.filter(
      (eventData) => {
        if (eventData.occurrences && !eventData.occurrences.length) {
          return false;
        }
        return true;
      }
    );

    return arrayMinusNoOccurenceInTimespan;
  }

  static _extractOccasions(eventDataArray: any[], options: OptionsType) {
    const arrayWithExtractedOccasions: any[] = [];

    const makeReplicatedEvent = (
      eventData: any,
      occurrenceDate: string,
      occurrenceDateEnd: string
    ) => {
      const occurrenceEvent = JSON.parse(JSON.stringify(eventData));
      occurrenceEvent.start.dateTime = occurrenceDate;
      occurrenceEvent.end.dateTime = occurrenceDateEnd;
      occurrenceEvent.recurringEventId = String(occurrenceEvent.id);
      occurrenceEvent.id =
        occurrenceEvent.id + "_" + trimISOdate(occurrenceDate);
      return occurrenceEvent;
    };

    const makeEventsByOccurrence = (eventData: any, options: OptionsType) => {
      let newEvents: any[] = eventData.occurrences.map((date: Date) => {
        const eventStart = new Date(eventData.end.dateTime).getTime();
        const eventEnd = new Date(eventData.end.dateTime).getTime();
        const eventLength = eventEnd - eventStart;
        const occurrenceDate = new Date(date);
        const occurrenceDateEnd = new Date(
          occurrenceDate.getTime() + eventLength
        );
        occurrenceDateEnd.setTime(occurrenceDate.getTime() + eventLength);
        const replicatedEvent = makeReplicatedEvent(
          eventData,
          occurrenceDate.toISOString(),
          occurrenceDateEnd.toISOString()
        );
        if (usedIDs.includes(replicatedEvent.id)) {
          return null;
        }
        return replicatedEvent;
      });
      return newEvents.filter((event) => event !== null);
    };

    eventDataArray.forEach((eventData) => {
      if (eventData.occurrences) {
        const extrapolated = makeEventsByOccurrence(eventData, options);
        arrayWithExtractedOccasions.push(...extrapolated);
      } else {
        arrayWithExtractedOccasions.push(eventData);
      }
    });

    return arrayWithExtractedOccasions;
  } //extract occasions

  static _addMetadata(eventDataArray: any[], options: OptionsType) {
    const inLocaleString = (date: string | Date, tzString: string) => {
      return (typeof date === "string" ? new Date(date) : date).toLocaleString(
        "en-US",
        { timeZone: tzString }
      );
    };
    const arrayWithMetadata = eventDataArray.map((eventData) => {
      if (options.timeZoneByEvent && eventData.start.timeZone) {
        eventData.startInLocaleString = inLocaleString(eventData.start.dateTime, eventData.start.timeZone);
      }
      return eventData;
    });
    return arrayWithMetadata;
  }

  static _minimizeData(eventDataArray: any[], options: OptionsType) {
    const minimizeEventData = (eventData: any) => {
      const newObject: VEventType = (({
        id,
        summary,
        description,
        start,
        end,
        startInLocaleString,
      }) => ({ id, summary, description, start, end, startInLocaleString }))(eventData);
      return newObject;
    };
    return eventDataArray.map((eventData) => minimizeEventData(eventData));
  }
}

// facts about events from Google API:
//// id is different for a recurred event that's changed---appends datetime _20220804T013000Z
//// also has recurringEventId pointing to id of original event

// a note about JS Dates from ISO
const isoStr1 = "2011-10-05T14:48:00.000Z";
// date is in GMT +0:00
const date1 = new Date(isoStr1);
// console.log(date1);  // 2011-10-05T14:48:00.000Z

// date is shifted to "local" time -4:00 in on Oct 5 for ET DST in my location
// note z is added back on, so can only use this as a string, not a time
const date2 = new Date(isoStr1.slice(0, -1));
// console.log(date2);  // 2011-10-05T18:48:00.000Z

// exampleEvents
const example1 = {
  kind: "calendar#event",
  etag: '"3316915795678000"',
  id: "1pg1flt62edvv544bot05tugbb",
  status: "confirmed",
  htmlLink:
    "https://www.google.com/calendar/event?eid=MXBnMWZsdDYyZWR2djU0NGJvdDA1dHVnYmJfMjAyMjA5MDYgMTNsamp1dmo4MDE3aWxvOTBlNmZydHU4ZWtAZw",
  created: "2022-07-22T02:44:57.000Z",
  updated: "2022-07-22T02:44:57.839Z",
  summary: "test 3 recur * 4 last occ after lfd",
  description: "should test false",
  creator: {
    email: "craigdempsey@gmail.com",
  },
  organizer: {
    email: "13ljjuvj8017ilo90e6frtu8ek@group.calendar.google.com",
    displayName: "craig public test",
    self: true,
  },
  start: {
    date: "2022-09-06",
  },
  end: {
    date: "2022-09-07",
  },
  recurrence: ["RRULE:FREQ=WEEKLY;WKST=SU;COUNT=4;BYDAY=TU"],
  transparency: "transparent",
  iCalUID: "1pg1flt62edvv544bot05tugbb@google.com",
  sequence: 0,
  eventType: "default",
};
const example2 = {
  kind: "calendar#event",
  etag: '"3316916242836000"',
  id: "35r46qa2m9fpbr5649vvqljfdk",
  status: "confirmed",
  htmlLink:
    "https://www.google.com/calendar/event?eid=MzVyNDZxYTJtOWZwYnI1NjQ5dnZxbGpmZGtfMjAyMjA3MjJUMDAwMDAwWiAxM2xqanV2ajgwMTdpbG85MGU2ZnJ0dThla0Bn",
  created: "2022-07-22T02:47:23.000Z",
  updated: "2022-07-22T02:48:41.418Z",
  summary: "test 4 recurr 4x 2 in range",
  description: "test true *2",
  creator: {
    email: "craigdempsey@gmail.com",
  },
  organizer: {
    email: "13ljjuvj8017ilo90e6frtu8ek@group.calendar.google.com",
    displayName: "craig public test",
    self: true,
  },
  start: {
    dateTime: "2022-07-21T20:00:00-04:00",
    timeZone: "America/New_York",
  },
  end: {
    dateTime: "2022-07-21T21:00:00-04:00",
    timeZone: "America/New_York",
  },
  recurrence: ["RRULE:FREQ=WEEKLY;WKST=SU;UNTIL=20220813T035959Z;BYDAY=TH"],
  iCalUID: "35r46qa2m9fpbr5649vvqljfdk@google.com",
  sequence: 1,
  eventType: "default",
};

//// make work without ldt
//  createDateDisplayString (DTSTARTldt) {
//   let months = ['1','2','3','4','5','6','7','8','9','10','11','12'];
//   let hours = ['1','2','3','4','5','6','7','8','9','10','11','12','1','2','3','4','5','6','7','8','9','10','11','12'];
//   let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

//   let D = DTSTARTldt
//   let dayStr = days[D.getDay()];
//   let mStr = months[D.getMonth()];
//   let dateStr = D.getDate();
//   let hrStr = hours[D.getHours()-1];
//   let ampm = D.getHours() < 12 ? 'am' : 'pm';
//   let zero = D.getMinutes() < 10 ? "0" : "";
//   let minStr = zero + String(D.getMinutes());
//   let result = `${dayStr} ${mStr}/${dateStr} ${hrStr}:${minStr}${ampm}`;

//   return result;
// }

// FE code for event template
// let eventTemplate = (occ) => {
//   let openComment = "<!--";
//   let closeComment = "-->";
//   let barSpan = "<span>|</span>";
//   let uriTZID = encodeURIComponent(occ.timeZone);
//   let uriNameStr = encodeURIComponent(occ.nameString);
//   let uriAddressStr = encodeURIComponent(occ.addressString);
//   let uriDetails = encodeURIComponent(occ.details);
//   let uriMapLink = `https://maps.google.com/maps?hl=en&q=${uriAddressStr}&source=calendar`;
//   let uriCalLink = `https://calendar.google.com/calendar/event?action=TEMPLATE&hl=en&text=${uriNameStr}&dates=${occ.timeCode}&location=${uriAddressStr}&ctz=${uriTZID}&details=${uriDetails}`;
//   let htmlOpen = `<li class="calendar-item">
//       <p class="date-time">${occ.dateString}</p>
//       <p class="info">
//           <span class="name">${occ.nameString}</span>`;

//   let htmlLocation = occ.location ? `   ${barSpan}
//           <a class="location" href="${uriMapLink}" target="_blank">
//               <span>${occ.addressString}</span>
//               <span class="icons"> <i class="fas fa-arrow-right"></i> <i class="fas fa-map-marker-alt"></i></span>
//           </a>` : '';

//   let htmlLink = occ.link ? `        ${barSpan}
//           <a class="link" href="${occ.link}" target="_blank">
//               <span> link </span>
//               <span class="icons"> <i class="fas fa-arrow-right"></i> <i class="fas fa-link"></i> </span>
//           </a>` : '';

//   let htmlClose = `        ${barSpan}
//           <a href="${uriCalLink}" target="_blank">
//               <span class="calendar-link icons"> <i class="fas fa-arrow-right"></i> <i class="fas fa-calendar-alt"></i></span>
//           </a>

//       </p>
//   </li>`;
//   let html = `${htmlOpen} ${htmlLocation} ${htmlLink} ${htmlClose}`;
//   return html;
// }
