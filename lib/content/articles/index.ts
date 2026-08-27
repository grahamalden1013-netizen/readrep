import type { Article } from "@/types/ngn";
import { governmentFunding } from "./government-funding";
import { onlineSpeechCase } from "./online-speech-case";
import { pricesAndInflation } from "./prices-and-inflation";
import { phonesInSchools } from "./phones-in-schools";
import { immigrationBillAnatomy } from "./immigration-bill-anatomy";
import { whoRegulatesAi } from "./who-regulates-ai";
import { redistricting } from "./redistricting";
import { vehicleClimateRules } from "./vehicle-climate-rules";
import { foreignAidAndWarPowers } from "./foreign-aid-and-war-powers";
import { healthCareCosts } from "./health-care-costs";
import { pipelineArticles } from "./pipeline";

/** Every article record, published and unpublished. */
export const ALL_ARTICLES: Article[] = [
  governmentFunding,
  onlineSpeechCase,
  pricesAndInflation,
  phonesInSchools,
  immigrationBillAnatomy,
  whoRegulatesAi,
  redistricting,
  vehicleClimateRules,
  foreignAidAndWarPowers,
  healthCareCosts,
  ...pipelineArticles,
];
