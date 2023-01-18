import { GigCal } from "../src/index";
import { exportForTesting } from "../src/gig-cal";
import { OptionsType } from "../lib/cjs/types/gig-cal";
import * as response1 from "./testData1.json";
import * as response7 from "./testData7.json";
import * as response8 from "./testData8.json";
import * as responseAll from "./testData.json";

const AugOne: Date = new Date("August 1, 2022 00:00:00");
const AugOneTime: number = AugOne.getTime();

describe("expand", () => {
  const options: OptionsType = {
    minTime: AugOneTime,
  };
  const result = GigCal.expand(responseAll, options);
  test("it should return array", () => {
    expect(result).toBeInstanceOf(Array);
  });
});

// 1. recurrence is infinite, starts before earlyfilterdate, true
// 1.1. recurrence is infinite, starts after latefilterdate, false
// 1.2. recurrence is infinite, starts within filter range, true
// 2. recurrence is limited, final before earlyfilterdate, false
// 3. recurrence is limited, starts after latefilterdate, false
// 4. recurrence is limited, some occurance falls within range, true
// 5. no recurrance falls before range, false
// 6 no recurrence falls within range, true
// 5.5 no recurrence falls after range, false
// 7 recurring, but one occ time change, ??
// 8 time is in paris at 6pm, what prints?
// 8.1 shows link from description

describe("recurrence", () => {
  const countPerSummary = (array: any[]) => {
    let obj: any = {};
    array.forEach((item: any) => {
      if (obj[item.summary]) {
        obj[item.summary]++;
      } else {
        obj[item.summary] = 1;
      }
    });
    return obj;
  };

  test("test 1.xx, it should return correct number of events if recurrs in or out of range", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
    };
    const result = GigCal.expand(response1, options);
    expect(result).toHaveLength(8);
  });

  test("test 7. recurring but one time change, it should show only one item for the changed event", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
    };
    const result = GigCal.expand(response7, options);
    expect(result).toHaveLength(5);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: "test 7 time change on one of events",
        }),
      ])
    );
  });

  test("check numbers of returns per summary", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
    };
    const result = GigCal.expand(responseAll, options);
    const expectedOutput = {
      "Earliest Date noon 8/1": 1,
      "test 4 recurr 4x 2 in range": 2,
      "test 7 time change on one of events": 5,
      "test 6 in-range": 1,
      "test 8.xx its in paris at 6pm": 1,
      "test 1.2 infinite, within filter": 3,
      "test 1 infinite, before efd": 5,
    };
    const counts = countPerSummary(result);
    expect(counts).toEqual(expect.objectContaining(expectedOutput));
  });
});



describe("metadata", () => {
  /// what should it be, also all have timeZone "USA, what if they dont?
  // then the date should not use to localeString, but some other to string
  test("test 8. time is in paris at 6pm and timezonebyevent option is false", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
      timeZoneByEvent: false,
    };
    const result = GigCal.expand(response8, options);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          // working on chrome in my TZ
          startAsString: "Tue Aug 09 2022 12:00:00 GMT-0400 (Eastern Daylight Time)",
        }),
      ])
    );
  });

  test("test 8. time is in paris at 6pm and timezonebyevent option is true", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
      timeZoneByEvent: true,
    };
    const result = GigCal.expand(response8, options);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          // working on chrome in my TZ
          startAsString: "8/9/2022, 6:00:00 PM",
        }),
      ])
    );
  });

  test("test 8.1 event obj should have array of urls if found in description", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
      // extractURLs: true, // is default
      // extractImages: true, // is default
    };
    const result = GigCal.expand(response8, options);
    // at least works for one case..  could do a loop of tests here with different formats
    expect(result[0].urls).toEqual(expect.arrayContaining(["www.craigdempsey.com"]))
  });

  test("test 8.2 event obj should have array of image urls if found in description", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
      // extractURLs: true, // is default
      // extractImages: true, // is default
    };
    const result = GigCal.expand(response8, options);
    console.log(result);
    // at least works for one case..  could do a loop of tests here with different formats
    expect(result[0].images).toEqual(expect.arrayContaining(["www.craigdempsey.com/image.gif"]))
  });
});

// TrimISODate given "2022-08-02T01:30:00.000Z" returns "20220802T013000Z"
describe("helpers", () => {
  test("TrimISODate should convert ISO date to ICS/rrule compatible format", () => {
    const result = exportForTesting.trimISOdate("2022-08-02T01:30:00.000Z");
    expect(result).toBe("20220802T013000Z");
  });
});
