import { GigCal } from "../src/index";
import { exportForTesting } from "../src/gig-cal";
import { OptionsType } from "../lib/cjs/types/gig-cal";
import * as response1 from "./testData1.json";
import * as response7 from "./testData7.json";
import * as response4 from "./testData4.json";
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
// 8.1 shows link in description

describe("recurrence", () => {

  const countPerSummary = (array: any[]) => {
    let obj: any = {};
    array.forEach((item: any) => {
      if (obj[item.summary]) { obj[item.summary] ++; }
      else { obj[item.summary] = 1; }
    })
    return obj;
  }

  test("it should have a number of matches five for 1.0, 3 for 1.1, 0 for 1.2 = 8", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
    };
    const result = GigCal.expand(response1, options);
    console.log(result);
    expect(result).toHaveLength(8);
  });

  test("7. recurring but one time change, it should show only one item for the changed event", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
    };
    const result = GigCal.expand(response7, options);
    expect(result).toHaveLength(5);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ summary: "test 7 time change on one of events" }),
      ])
    );
  });

  test("check numbers of returns per summary", () => {
    const options: OptionsType = {
      minTime: AugOneTime,
    };
    const result = GigCal.expand(responseAll, options);
    const expectedOutput = {
        'Earliest Date noon 8/1': 1,
        'test 4 recurr 4x 2 in range': 2,
        'test 7 time change on one of events': 5,
        'test 6 in-range': 1,
        'test 8.xx its in paris at 6pm': 1,
        'test 1.2 infinite, within filter': 3,
        'test 1 infinite, before efd': 5
       }
    const counts = countPerSummary(result);
    expect(counts).toEqual(expect.objectContaining(expectedOutput));
  })

});

// TrimISODate given "2022-08-02T01:30:00.000Z" returns "20220802T013000Z"
describe("helpers", () => {
  test("TrimISODate should convert ISO date to ICS/rrule compatible format", () => {
    const result = exportForTesting.trimISOdate("2022-08-02T01:30:00.000Z");
    expect(result).toBe("20220802T013000Z");
  })
})