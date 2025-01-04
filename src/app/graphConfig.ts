
type NodeConfig = {}
type LinkConfig = {}
type ForceConfig = {}
type ZoomConfig = {}
type BackgroundConfig = {}
type OpenerConfig = {
  program: string
}

export type Config = {
  node: NodeConfig,
  link: LinkConfig
  force: ForceConfig,
  zoom: ZoomConfig,
  opener: OpenerConfig,
  background: BackgroundConfig,
}


export const defaultConfig: Config = {
  node: {
    baseRadius: 12,
    radiusMultiplier: 0.5,
    color: {
      note: {
        fill: "#1f77b4",
        highlightFill: "#ff6b6b", // Highlight color for nodes
      },
      tag: {
        fill: "#cc77cc",
        highlightFill: "#ff77ff",
      }
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
    highlightStroke: "#ff6b6b",
    opacity: 1,
    strength: 2,
    dimOpacity: 0.2,
    highlightOpacity: 1,
    arrowSize: 3, // Size of the arrow marker
  },
  force: {
    centerForce: 0.1, // How strongly nodes are pulled to the center (0-1)
    repelForce: -500, // How strongly nodes push away from each other
    linkForce: 0.2, // How strongly connected nodes pull together (0-1)
    linkDistance: 100, // Base distance between connected nodes
  },
  zoom: {
    min: 0.1,
    max: 10,
    defaultScale: 0.2,
  },
  opener: {
    program: "neovide"
  }, // Open configuration object with opener property
  background: {
    color: "#ffffee"
  }
};
