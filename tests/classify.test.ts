import { describe, expect, it } from "vitest";

import { classifyEvent, extractCourse } from "@/lib/schoology/classify";
import { estimateMinutes } from "@/lib/schoology/estimate";

describe("classifyEvent", () => {
  it("classifies the real title shapes from the Schoology feed", () => {
    expect(classifyEvent("HW: Problem Set 1").type).toBe("HOMEWORK");
    expect(classifyEvent("HW 1.2: Grabación").type).toBe("HOMEWORK");
    expect(classifyEvent("CW: Escribe un párrafo").type).toBe("CLASSWORK");
    expect(classifyEvent("MAJOR: Summer Assignment Mini Assessment").type).toBe(
      "MAJOR_ASSESSMENT",
    );
    expect(classifyEvent("MAJOR: Unit 1 Assessment").type).toBe(
      "MAJOR_ASSESSMENT",
    );
  });

  it("does not let 'Assignment' in a MAJOR title downgrade it to homework", () => {
    // This title contains "Assignment", which is a homework keyword.
    const result = classifyEvent("MAJOR: Summer Assignment Mini Assessment");
    expect(result.type).toBe("MAJOR_ASSESSMENT");
  });

  it("lets the prefix win over keywords in the body", () => {
    // "quiz" appears in the body but the work itself is homework.
    expect(classifyEvent("HW: study for the quiz").type).toBe("HOMEWORK");
    expect(classifyEvent("CW: exam practice problems").type).toBe("CLASSWORK");
  });

  it("recognises the remaining categories", () => {
    expect(classifyEvent("QUIZ: Vocab 3").type).toBe("QUIZ");
    expect(classifyEvent("PROJECT: Solar System Model").type).toBe("PROJECT");
    expect(classifyEvent("TEST: Chapter 4").type).toBe("MAJOR_ASSESSMENT");
    expect(classifyEvent("EXAM: Midterm").type).toBe("MAJOR_ASSESSMENT");
  });

  it("falls back to a generic assignment for anything else", () => {
    expect(classifyEvent("Picture Day").type).toBe("SCHOOL_EVENT");
    expect(classifyEvent("Field trip permission slip").type).toBe(
      "SCHOOL_EVENT",
    );
  });

  it("strips the prefix from the display title", () => {
    expect(classifyEvent("HW 1.2: Grabación").cleanTitle).toBe("Grabación");
    expect(classifyEvent("MAJOR: Unit 1 Assessment").cleanTitle).toBe(
      "Unit 1 Assessment",
    );
    // No prefix means the title is left alone.
    expect(classifyEvent("Picture Day").cleanTitle).toBe("Picture Day");
  });

  it("treats a long sentence before a colon as prose, not a label", () => {
    const title =
      "Remember to bring your signed permission form before Friday: details inside";
    expect(classifyEvent(title).cleanTitle).toBe(title);
  });

  it("classifies keywords without a prefix", () => {
    expect(classifyEvent("Unit 3 Exam").type).toBe("MAJOR_ASSESSMENT");
    expect(classifyEvent("Vocabulary quiz").type).toBe("QUIZ");
  });
});

describe("extractCourse", () => {
  it("reads a course from a bracketed suffix", () => {
    expect(extractCourse("HW: Problem Set 1 (Algebra II)")).toBe("Algebra II");
    expect(extractCourse("CW: Párrafo [Spanish 3]")).toBe("Spanish 3");
  });

  it("reads a course from a labelled description line", () => {
    expect(extractCourse("HW: Problem Set 1", "Course: Chemistry\nDue Friday")).toBe(
      "Chemistry",
    );
  });

  it("returns null rather than guessing", () => {
    expect(extractCourse("HW: Problem Set 1")).toBeNull();
    expect(extractCourse("HW: Problem Set (5)")).toBeNull();
    expect(extractCourse("Read chapter 4", "No course information here")).toBeNull();
  });
});

describe("estimateMinutes", () => {
  it("uses a sensible baseline per type", () => {
    expect(estimateMinutes("CLASSWORK", "Escribe un párrafo")).toBeLessThan(
      estimateMinutes("HOMEWORK", "Problem Set 1"),
    );
    expect(estimateMinutes("HOMEWORK", "Problem Set 1")).toBeLessThan(
      estimateMinutes("MAJOR_ASSESSMENT", "Unit 1 Assessment"),
    );
  });

  it("scales up for heavier work", () => {
    expect(estimateMinutes("HOMEWORK", "Write an essay")).toBeGreaterThan(
      estimateMinutes("HOMEWORK", "Turn in form"),
    );
  });

  it("scales down for quick admin tasks", () => {
    expect(
      estimateMinutes("SCHOOL_EVENT", "Bring signed permission form"),
    ).toBeLessThanOrEqual(20);
  });

  it("always returns a usable, rounded duration", () => {
    for (const title of ["", "a", "essay research paper write-up read study"]) {
      const minutes = estimateMinutes("HOMEWORK", title);
      expect(minutes).toBeGreaterThanOrEqual(10);
      expect(minutes).toBeLessThanOrEqual(240);
      expect(minutes % 5).toBe(0);
    }
  });
});
