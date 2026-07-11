import { describe, expect, test } from "vitest";
import { formatMoney, parseMoney } from "./money";

describe("parseMoney", () => {
  test("parses whole dollars to cents", () => {
    expect(parseMoney("1234")).toBe(123400);
  });

  test("parses dollars and cents", () => {
    expect(parseMoney("1234.56")).toBe(123456);
  });

  test("parses a single decimal digit as tens of cents", () => {
    expect(parseMoney("1234.5")).toBe(123450);
  });

  test("accepts thousands separators", () => {
    expect(parseMoney("1,234.56")).toBe(123456);
  });

  test("accepts a leading dollar sign and surrounding whitespace", () => {
    expect(parseMoney(" $1,234.56 ")).toBe(123456);
  });

  test("parses zero", () => {
    expect(parseMoney("0")).toBe(0);
  });

  test("rejects negative amounts", () => {
    expect(parseMoney("-5")).toBeNull();
  });

  test("rejects more than two decimal digits", () => {
    expect(parseMoney("1.234")).toBeNull();
  });

  test("rejects empty and non-numeric input", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("12a")).toBeNull();
  });
});

describe("formatMoney", () => {
  test("formats cents as dollars with thousands separators", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
  });

  test("formats zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  test("formats negative amounts with a leading minus", () => {
    expect(formatMoney(-123456)).toBe("-$1,234.56");
  });
});
