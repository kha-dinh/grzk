export type FillConfig = {
  normal: string;
  highlight: string;
};
export type NodeConfig = {
  baseRadius: number;
  radiusMultiplier: number;
  color: {
    note: FillConfig;
    tag: FillConfig;
  };
  fontSize: number;
  textColor: string;
  textYOffset: number;
  dimOpacity: number;
  highlightOpacity: number;
  transitionDuration: number;
};
type LinkConfig = {
  stroke: string;
  highlight: string;
  opacity: number;
  dimOpacity: number;
  highlightOpacity: number;
  arrowSize: number;
  transitionDuration: number;
};
type ForceConfig = {
  centerForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
};
type ZoomConfig = {
  min: number;
  max: number;
  defaultScale: number;
};
type BackgroundConfig = {
  color: string;
};
type OpenerConfig = {
  program: string;
};

export type GraphConfig = {
  node: NodeConfig;
  link: LinkConfig;
  force: ForceConfig;
  zoom: ZoomConfig;
  opener: OpenerConfig;
  background: BackgroundConfig;
};

export const defaultConfig: GraphConfig = {
  node: {
    baseRadius: 14,
    radiusMultiplier: 0.1,
    color: {
      note: {
        normal: "#1f77b4",
        highlight: "#ff6b6b", // Highlight color for nodes
      },
      tag: {
        normal: "#cc77cc",
        highlight: "#ff77ff",
      },
    },
    fontSize: 25,
    textColor: "#333333", // Added text color configuration
    textYOffset: 30, // Added offset for text below node
    dimOpacity: 0.2,
    highlightOpacity: 1,
    transitionDuration: 300,
  },
  link: {
    stroke: "#999",
    highlight: "#ff6b6b",
    opacity: 1,
    dimOpacity: 0.2,
    highlightOpacity: 1,
    arrowSize: 3, // Size of the arrow marker
    transitionDuration: 300,
  },
  force: {
    centerForce: 0.1, // How strongly nodes are pulled to the center (0-1)
    repelForce: -1000, // How strongly nodes push away from each other
    linkForce: 0.2, // How strongly connected nodes pull together (0-1)
    linkDistance: 100, // Base distance between connected nodes
  },
  zoom: {
    min: 0.1,
    max: 10,
    defaultScale: 0.4,
  },
  opener: {
    program: "nvr",
  }, // Open configuration object with opener property
  background: {
    color: "#ffffee",
  },
};
