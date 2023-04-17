export type Breakpoints = Map<
  string,
  {
    id: string;
    label: string;
    minWidth?: number | undefined;
    maxWidth?: number | undefined;
  }
>;

export type Instances = Map<
  string,
  {
    type: "instance";
    id: string;
    component: string;
    label?: string | undefined;
    children: (
      | {
          type: "id";
          value: string;
        }
      | {
          type: "text";
          value: string;
        }
    )[];
  }
>;

export type Pages = {
  homePage: {
    id: string;
    name: string;
    title: string;
    meta: {
      [x: string]: string;
    };
    rootInstanceId: string;
    path: string;
  };
  pages: {
    id: string;
    name: string;
    title: string;
    meta: {
      [x: string]: string;
    };
    rootInstanceId: string;
    path: string;
  }[];
};

export type Props = Map<
  string,
  | {
      id: string;
      instanceId: string;
      name: string;
      required?: boolean | undefined;
      type: "number";
      value: number;
    }
  | {
      id: string;
      instanceId: string;
      name: string;
      required?: boolean | undefined;
      type: "string";
      value: string;
    }
  | {
      id: string;
      instanceId: string;
      name: string;
      required?: boolean | undefined;
      type: "boolean";
      value: boolean;
    }
  | {
      id: string;
      instanceId: string;
      name: string;
      required?: boolean | undefined;
      type: "asset";
      value: string;
    }
  | {
      id: string;
      instanceId: string;
      name: string;
      required?: boolean | undefined;
      type: "page";
      value: string;
    }
  | {
      id: string;
      instanceId: string;
      name: string;
      required?: boolean | undefined;
      type: "string[]";
      value: string[];
    }
>;

export type StyleSourceSelections = Map<
  string,
  {
    instanceId: string;
    values: string[];
  }
>;

export type StyleSource =
  | {
      type: "token";
      id: string;
      name: string;
    }
  | {
      type: "local";
      id: string;
    };

export type Styles = Map<
  string,
  {
    styleSourceId: string;
    breakpointId: string;
    state?: string | undefined;
    property: string;
    value:
      | (
          | {
              type: "image";
              value:
                | {
                    type: "asset";
                    value: string;
                  }
                | {
                    type: "url";
                    url: string;
                  };
              hidden?: boolean | undefined;
            }
          | {
              type: "layers";
              value: (
                | {
                    type: "unit";
                    unit:
                      | (
                          | "%"
                          | "deg"
                          | "grad"
                          | "rad"
                          | "turn"
                          | "db"
                          | "fr"
                          | "hz"
                          | "khz"
                          | "cm"
                          | "mm"
                          | "q"
                          | "in"
                          | "pt"
                          | "pc"
                          | "px"
                          | "em"
                          | "rem"
                          | "ex"
                          | "rex"
                          | "cap"
                          | "rcap"
                          | "ch"
                          | "rch"
                          | "ic"
                          | "ric"
                          | "lh"
                          | "rlh"
                          | "vw"
                          | "svw"
                          | "lvw"
                          | "dvw"
                          | "vh"
                          | "svh"
                          | "lvh"
                          | "dvh"
                          | "vi"
                          | "svi"
                          | "lvi"
                          | "dvi"
                          | "vb"
                          | "svb"
                          | "lvb"
                          | "dvb"
                          | "vmin"
                          | "svmin"
                          | "lvmin"
                          | "dvmin"
                          | "vmax"
                          | "svmax"
                          | "lvmax"
                          | "dvmax"
                          | "cqw"
                          | "cqh"
                          | "cqi"
                          | "cqb"
                          | "cqmin"
                          | "cqmax"
                          | "dpi"
                          | "dpcm"
                          | "dppx"
                          | "x"
                          | "st"
                          | "s"
                          | "ms"
                        )
                      | "number";
                    value: number;
                  }
                | {
                    type: "keyword";
                    value: string;
                  }
                | {
                    type: "unparsed";
                    value: string;
                    hidden?: boolean | undefined;
                  }
                | {
                    type: "image";
                    value:
                      | {
                          type: "asset";
                          value: string;
                        }
                      | {
                          type: "url";
                          url: string;
                        };
                    hidden?: boolean | undefined;
                  }
                | {
                    type: "tuple";
                    value: (
                      | {
                          type: "unit";
                          unit:
                            | (
                                | "%"
                                | "deg"
                                | "grad"
                                | "rad"
                                | "turn"
                                | "db"
                                | "fr"
                                | "hz"
                                | "khz"
                                | "cm"
                                | "mm"
                                | "q"
                                | "in"
                                | "pt"
                                | "pc"
                                | "px"
                                | "em"
                                | "rem"
                                | "ex"
                                | "rex"
                                | "cap"
                                | "rcap"
                                | "ch"
                                | "rch"
                                | "ic"
                                | "ric"
                                | "lh"
                                | "rlh"
                                | "vw"
                                | "svw"
                                | "lvw"
                                | "dvw"
                                | "vh"
                                | "svh"
                                | "lvh"
                                | "dvh"
                                | "vi"
                                | "svi"
                                | "lvi"
                                | "dvi"
                                | "vb"
                                | "svb"
                                | "lvb"
                                | "dvb"
                                | "vmin"
                                | "svmin"
                                | "lvmin"
                                | "dvmin"
                                | "vmax"
                                | "svmax"
                                | "lvmax"
                                | "dvmax"
                                | "cqw"
                                | "cqh"
                                | "cqi"
                                | "cqb"
                                | "cqmin"
                                | "cqmax"
                                | "dpi"
                                | "dpcm"
                                | "dppx"
                                | "x"
                                | "st"
                                | "s"
                                | "ms"
                              )
                            | "number";
                          value: number;
                        }
                      | {
                          type: "keyword";
                          value: string;
                        }
                      | {
                          type: "unparsed";
                          value: string;
                          hidden?: boolean | undefined;
                        }
                    )[];
                  }
                | {
                    type: "invalid";
                    value: string;
                  }
              )[];
            }
          | {
              type: "unit";
              unit:
                | (
                    | "%"
                    | "deg"
                    | "grad"
                    | "rad"
                    | "turn"
                    | "db"
                    | "fr"
                    | "hz"
                    | "khz"
                    | "cm"
                    | "mm"
                    | "q"
                    | "in"
                    | "pt"
                    | "pc"
                    | "px"
                    | "em"
                    | "rem"
                    | "ex"
                    | "rex"
                    | "cap"
                    | "rcap"
                    | "ch"
                    | "rch"
                    | "ic"
                    | "ric"
                    | "lh"
                    | "rlh"
                    | "vw"
                    | "svw"
                    | "lvw"
                    | "dvw"
                    | "vh"
                    | "svh"
                    | "lvh"
                    | "dvh"
                    | "vi"
                    | "svi"
                    | "lvi"
                    | "dvi"
                    | "vb"
                    | "svb"
                    | "lvb"
                    | "dvb"
                    | "vmin"
                    | "svmin"
                    | "lvmin"
                    | "dvmin"
                    | "vmax"
                    | "svmax"
                    | "lvmax"
                    | "dvmax"
                    | "cqw"
                    | "cqh"
                    | "cqi"
                    | "cqb"
                    | "cqmin"
                    | "cqmax"
                    | "dpi"
                    | "dpcm"
                    | "dppx"
                    | "x"
                    | "st"
                    | "s"
                    | "ms"
                  )
                | "number";
              value: number;
            }
          | {
              type: "keyword";
              value: string;
            }
          | {
              type: "fontFamily";
              value: string[];
            }
          | {
              type: "rgb";
              r: number;
              g: number;
              b: number;
              alpha: number;
            }
          | {
              type: "unparsed";
              value: string;
              hidden?: boolean | undefined;
            }
          | {
              type: "tuple";
              value: (
                | {
                    type: "unit";
                    unit:
                      | (
                          | "%"
                          | "deg"
                          | "grad"
                          | "rad"
                          | "turn"
                          | "db"
                          | "fr"
                          | "hz"
                          | "khz"
                          | "cm"
                          | "mm"
                          | "q"
                          | "in"
                          | "pt"
                          | "pc"
                          | "px"
                          | "em"
                          | "rem"
                          | "ex"
                          | "rex"
                          | "cap"
                          | "rcap"
                          | "ch"
                          | "rch"
                          | "ic"
                          | "ric"
                          | "lh"
                          | "rlh"
                          | "vw"
                          | "svw"
                          | "lvw"
                          | "dvw"
                          | "vh"
                          | "svh"
                          | "lvh"
                          | "dvh"
                          | "vi"
                          | "svi"
                          | "lvi"
                          | "dvi"
                          | "vb"
                          | "svb"
                          | "lvb"
                          | "dvb"
                          | "vmin"
                          | "svmin"
                          | "lvmin"
                          | "dvmin"
                          | "vmax"
                          | "svmax"
                          | "lvmax"
                          | "dvmax"
                          | "cqw"
                          | "cqh"
                          | "cqi"
                          | "cqb"
                          | "cqmin"
                          | "cqmax"
                          | "dpi"
                          | "dpcm"
                          | "dppx"
                          | "x"
                          | "st"
                          | "s"
                          | "ms"
                        )
                      | "number";
                    value: number;
                  }
                | {
                    type: "keyword";
                    value: string;
                  }
                | {
                    type: "unparsed";
                    value: string;
                    hidden?: boolean | undefined;
                  }
              )[];
            }
        )
      | {
          type: "invalid";
          value: string;
        }
      | {
          type: "unset";
          value: "";
        }
      | {
          type: "var";
          value: string;
          fallbacks: (
            | {
                type: "image";
                value:
                  | {
                      type: "asset";
                      value: string;
                    }
                  | {
                      type: "url";
                      url: string;
                    };
                hidden?: boolean | undefined;
              }
            | {
                type: "layers";
                value: (
                  | {
                      type: "unit";
                      unit:
                        | (
                            | "%"
                            | "deg"
                            | "grad"
                            | "rad"
                            | "turn"
                            | "db"
                            | "fr"
                            | "hz"
                            | "khz"
                            | "cm"
                            | "mm"
                            | "q"
                            | "in"
                            | "pt"
                            | "pc"
                            | "px"
                            | "em"
                            | "rem"
                            | "ex"
                            | "rex"
                            | "cap"
                            | "rcap"
                            | "ch"
                            | "rch"
                            | "ic"
                            | "ric"
                            | "lh"
                            | "rlh"
                            | "vw"
                            | "svw"
                            | "lvw"
                            | "dvw"
                            | "vh"
                            | "svh"
                            | "lvh"
                            | "dvh"
                            | "vi"
                            | "svi"
                            | "lvi"
                            | "dvi"
                            | "vb"
                            | "svb"
                            | "lvb"
                            | "dvb"
                            | "vmin"
                            | "svmin"
                            | "lvmin"
                            | "dvmin"
                            | "vmax"
                            | "svmax"
                            | "lvmax"
                            | "dvmax"
                            | "cqw"
                            | "cqh"
                            | "cqi"
                            | "cqb"
                            | "cqmin"
                            | "cqmax"
                            | "dpi"
                            | "dpcm"
                            | "dppx"
                            | "x"
                            | "st"
                            | "s"
                            | "ms"
                          )
                        | "number";
                      value: number;
                    }
                  | {
                      type: "keyword";
                      value: string;
                    }
                  | {
                      type: "unparsed";
                      value: string;
                      hidden?: boolean | undefined;
                    }
                  | {
                      type: "image";
                      value:
                        | {
                            type: "asset";
                            value: string;
                          }
                        | {
                            type: "url";
                            url: string;
                          };
                      hidden?: boolean | undefined;
                    }
                  | {
                      type: "tuple";
                      value: (
                        | {
                            type: "unit";
                            unit:
                              | (
                                  | "%"
                                  | "deg"
                                  | "grad"
                                  | "rad"
                                  | "turn"
                                  | "db"
                                  | "fr"
                                  | "hz"
                                  | "khz"
                                  | "cm"
                                  | "mm"
                                  | "q"
                                  | "in"
                                  | "pt"
                                  | "pc"
                                  | "px"
                                  | "em"
                                  | "rem"
                                  | "ex"
                                  | "rex"
                                  | "cap"
                                  | "rcap"
                                  | "ch"
                                  | "rch"
                                  | "ic"
                                  | "ric"
                                  | "lh"
                                  | "rlh"
                                  | "vw"
                                  | "svw"
                                  | "lvw"
                                  | "dvw"
                                  | "vh"
                                  | "svh"
                                  | "lvh"
                                  | "dvh"
                                  | "vi"
                                  | "svi"
                                  | "lvi"
                                  | "dvi"
                                  | "vb"
                                  | "svb"
                                  | "lvb"
                                  | "dvb"
                                  | "vmin"
                                  | "svmin"
                                  | "lvmin"
                                  | "dvmin"
                                  | "vmax"
                                  | "svmax"
                                  | "lvmax"
                                  | "dvmax"
                                  | "cqw"
                                  | "cqh"
                                  | "cqi"
                                  | "cqb"
                                  | "cqmin"
                                  | "cqmax"
                                  | "dpi"
                                  | "dpcm"
                                  | "dppx"
                                  | "x"
                                  | "st"
                                  | "s"
                                  | "ms"
                                )
                              | "number";
                            value: number;
                          }
                        | {
                            type: "keyword";
                            value: string;
                          }
                        | {
                            type: "unparsed";
                            value: string;
                            hidden?: boolean | undefined;
                          }
                      )[];
                    }
                  | {
                      type: "invalid";
                      value: string;
                    }
                )[];
              }
            | {
                type: "unit";
                unit:
                  | (
                      | "%"
                      | "deg"
                      | "grad"
                      | "rad"
                      | "turn"
                      | "db"
                      | "fr"
                      | "hz"
                      | "khz"
                      | "cm"
                      | "mm"
                      | "q"
                      | "in"
                      | "pt"
                      | "pc"
                      | "px"
                      | "em"
                      | "rem"
                      | "ex"
                      | "rex"
                      | "cap"
                      | "rcap"
                      | "ch"
                      | "rch"
                      | "ic"
                      | "ric"
                      | "lh"
                      | "rlh"
                      | "vw"
                      | "svw"
                      | "lvw"
                      | "dvw"
                      | "vh"
                      | "svh"
                      | "lvh"
                      | "dvh"
                      | "vi"
                      | "svi"
                      | "lvi"
                      | "dvi"
                      | "vb"
                      | "svb"
                      | "lvb"
                      | "dvb"
                      | "vmin"
                      | "svmin"
                      | "lvmin"
                      | "dvmin"
                      | "vmax"
                      | "svmax"
                      | "lvmax"
                      | "dvmax"
                      | "cqw"
                      | "cqh"
                      | "cqi"
                      | "cqb"
                      | "cqmin"
                      | "cqmax"
                      | "dpi"
                      | "dpcm"
                      | "dppx"
                      | "x"
                      | "st"
                      | "s"
                      | "ms"
                    )
                  | "number";
                value: number;
              }
            | {
                type: "keyword";
                value: string;
              }
            | {
                type: "fontFamily";
                value: string[];
              }
            | {
                type: "rgb";
                r: number;
                g: number;
                b: number;
                alpha: number;
              }
            | {
                type: "unparsed";
                value: string;
                hidden?: boolean | undefined;
              }
            | {
                type: "tuple";
                value: (
                  | {
                      type: "unit";
                      unit:
                        | (
                            | "%"
                            | "deg"
                            | "grad"
                            | "rad"
                            | "turn"
                            | "db"
                            | "fr"
                            | "hz"
                            | "khz"
                            | "cm"
                            | "mm"
                            | "q"
                            | "in"
                            | "pt"
                            | "pc"
                            | "px"
                            | "em"
                            | "rem"
                            | "ex"
                            | "rex"
                            | "cap"
                            | "rcap"
                            | "ch"
                            | "rch"
                            | "ic"
                            | "ric"
                            | "lh"
                            | "rlh"
                            | "vw"
                            | "svw"
                            | "lvw"
                            | "dvw"
                            | "vh"
                            | "svh"
                            | "lvh"
                            | "dvh"
                            | "vi"
                            | "svi"
                            | "lvi"
                            | "dvi"
                            | "vb"
                            | "svb"
                            | "lvb"
                            | "dvb"
                            | "vmin"
                            | "svmin"
                            | "lvmin"
                            | "dvmin"
                            | "vmax"
                            | "svmax"
                            | "lvmax"
                            | "dvmax"
                            | "cqw"
                            | "cqh"
                            | "cqi"
                            | "cqb"
                            | "cqmin"
                            | "cqmax"
                            | "dpi"
                            | "dpcm"
                            | "dppx"
                            | "x"
                            | "st"
                            | "s"
                            | "ms"
                          )
                        | "number";
                      value: number;
                    }
                  | {
                      type: "keyword";
                      value: string;
                    }
                  | {
                      type: "unparsed";
                      value: string;
                      hidden?: boolean | undefined;
                    }
                )[];
              }
          )[];
        };
  }
>;
