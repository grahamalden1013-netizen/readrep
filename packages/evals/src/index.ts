/**
 * @readrep/evals — the benchmark that decides whether a model change helped.
 *
 * Fixture schema, coverage requirements, scoring, and a runner that works today
 * and reports zero fixtures, because the benchmark has not been labelled yet.
 * Labelling requires authorized footage and a pilot coach. Nothing in this
 * package is fabricated, and a fabricated fixture would make the whole set
 * worthless.
 */
export * from "./fixture";
export * from "./coverage";
export * from "./scoring";
export * from "./runner";
