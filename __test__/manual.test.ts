import { GigCal } from "../src/index";
import { OptionsType } from "../lib/cjs/types/gig-cal";
import * as response from "./testData.json";

const AugOne: Date = new Date("August 1, 2022 00:00:00");
const AugOneTime: number = AugOne.getTime();
// console.log(AugOneTime);

const options: OptionsType = {
  minTime: AugOneTime,
};

const result = GigCal.expand(response, options);
console.log(result);

describe("expand", () => {
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
  test("1. recurrence is infinite, starts before earlyfilterdate, it should have a number of matches", () => {
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ summary: "test 1 infinite, before efd" }),
      ])
    );
  });
});
