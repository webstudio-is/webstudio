import { properties } from "./properties";

type Properties = typeof properties;

export type StyleProperty = keyof Properties;

export type AppliesTo = Properties[StyleProperty]["appliesTo"];
