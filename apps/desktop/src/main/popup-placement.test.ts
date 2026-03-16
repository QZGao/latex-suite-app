import { describe, expect, it } from "vitest";
import { computePopupBounds } from "./popup-placement.js";

describe("computePopupBounds", () => {
  it("centers the popup over the source window when space allows", () => {
    expect(
      computePopupBounds(
        {
          width: 520,
          minHeight: 260,
          previewRatio: 0.45,
          closeOnBlur: true
        },
        {
          x: 200,
          y: 200,
          width: 800,
          height: 600
        },
        {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080
        }
      )
    ).toMatchObject({
      width: 520,
      height: 400,
      x: 340,
      y: 300
    });
  });

  it("clamps the popup into the display work area", () => {
    expect(
      computePopupBounds(
        {
          width: 520,
          minHeight: 260,
          previewRatio: 0.45,
          closeOnBlur: true
        },
        {
          x: -200,
          y: -200,
          width: 120,
          height: 80
        },
        {
          x: 0,
          y: 0,
          width: 800,
          height: 600
        }
      )
    ).toMatchObject({
      x: 12,
      y: 12
    });
  });
});
