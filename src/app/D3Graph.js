import * as d3 from "d3";

export class GraphVisualizer {
  constructor(svg, config, rawData, tags) {
    this.svg = svg;
    this.config = config;
    this.data = this.processGraphData(rawData, tags);
    this.filtered = null;

    this.tagFilter = []
    this.filter = ""

    this.tags = tags;
    this.simulation = null;
    this.zoomGroup = null;
    this.nodes = null;
    this.links = null;
  }

  async initialize() {
    try {
      this.applyFilter()
      this.setupSimulation();
      this.createVisualization();
      this.setupZoom();
    } catch (error) {
      console.error("Failed to initialize graph:", error);
    }
  }

  createNodes() {

  }
  applyFilter() {
    if (this.filter == "") {
      this.filtered = this.data
      return;
    }
    let tagNodes = this.data.nodes
      .filter((d) => d.type == "tag");

    console.log(tagNodes);
    console.log(this.tagFilter);
    if (this.tagFilter.length != 0) {
      tagNodes = tagNodes
        .filter((d) => this.tagFilter.some((f) => d.name == f.value));
    }

    const fuzzySearch = createFuzzySearch(
      this.data.nodes.filter((d) => d.type != "tag"),
      {
        getText: (item) => [item.title],
      },
    );


    let selectedNodes = fuzzySearch(this.filter).map((n) => n.item);
    const connectedTags = tagNodes.filter((d) => {
      let connected = this.getConnectedNodes(d);
      return selectedNodes.some((n) => {
        return connected.has(n.path);
      });
    });


    let connectedLinks = new Set();
    selectedNodes.forEach((n) => {
      let links = this.getConnectedLinks(n);
      if (links) {
        links = [...links].filter(
          (l) =>
            selectedNodes.some((n) => l.source.path === n.path) &&
            selectedNodes.some((n) => l.target.path === n.path)

        );
        if (links.length > 0) {
          connectedLinks.add(...links);
        }
      }
    });
    connectedLinks = [...connectedLinks]
    this.filtered = {
      nodes: selectedNodes,
      links: connectedLinks,
      tagNodes: connectedTags,
      tagLinks: []
    }
  }
  calculateConnectionCounts(nodes, links) {
    const counts = Object.fromEntries(nodes.map((node) => [node.path, 0]));

    links.forEach((link) => {
      counts[link.source]++;
      counts[link.target]++;
    });

    return counts;
  }

  processGraphData(rawData, tags) {
    const validPaths = rawData.notes.map((note) => note.path);
    const links = rawData.links
      .filter(
        (edge) =>
          validPaths.includes(edge.targetPath) &&
          validPaths.includes(edge.sourcePath),
      )
      .map((edge) => ({
        // We link nodes base on their "path"
        source: edge.sourcePath,
        target: edge.targetPath,
      }));

    const connectionCounts = this.calculateConnectionCounts(
      rawData.notes,
      links,
    );

    let nodes = rawData.notes.map((note) => {
      if (note.title.length > 60) {
        note.title = note.title.slice(0, 60) + "...";
      }
      return {
        ...note,
        type: "note",
        connections: connectionCounts[note.path] || 0,
      };
    });

    // }

    let tagLinks = []
    let tagNodes = []
    tags.map((tag) => {
      const _tagLinks = rawData.notes.filter((note) =>
        note.tags.includes(tag.name),
      );

      // NOTE: We link nodes base on their path
      const tagNode = {
        title: tag.name,
        connections: _tagLinks.length,
        type: "tag",
        id: 999,
        path: tag.name,
        x: 0.0, y: 0.0, vx: 0.0, vy: 0.0
      };
      tagNodes.push(tagNode);
      _tagLinks.map((note) => {
        // console.log(note);
        tagLinks.push({
          source: tagNode.path,
          target: note.path,
        });
      });
    });

    // console.log(rawData.links);
    // console.log(links);
    // console.log(nodes);
    // console.log(tags);

    return { nodes, links, tagNodes, tagLinks };
  }

  refreshSimulationConfig() {
    this.simulation
      .alphaDecay(0.02) // slower cooling
      .velocityDecay(0.2) // more momentum
      .alpha(1).restart();

    this.simulation.force("center")
      .strength(this.config.force.centerForce)
      .initialize([...this.filtered.nodes, ...this.filtered.tagNodes]);
    // this.simulation.force("x").initialize(this.config.force.centerForce);
    // this.simulation.force("y").initialize(this.config.force.centerForce);

  }
  setupSimulation() {
    const allNodes = [...this.filtered.nodes, ...this.filtered.tagNodes]
    if (!this.simulation) {
      this.simulation = d3
        .forceSimulation(allNodes);
    }

    this.simulation
      .alphaDecay(0.01) // slower cooling
      .velocityDecay(0.5) // more momentum
      .alpha(5).restart();

    this.simulation
      // (re)initialize
      .force(
        "x",
        d3.forceX().strength(this.config.force.centerForce))
      .force(
        "y",
        d3.forceY().strength(this.config.force.centerForce))
      // Repel force - pushes nodes away from each other
      .force(
        "repel",
        d3.forceManyBody().strength(this.config.force.repelForce),
      );
  }


  createVisualization(data) {
    this.zoomGroup = this.svg.append("g").attr("class", "zoom-group");

    if (this.links) {
      this.links.remove();
    }
    if (this.nodes) {
      this.nodes.remove();
    }
    if (this.tagNodes) {
      this.tagNodes.remove();
    }
    if (this.tagLinks) {
      this.tagLinks.remove();
    }

    this.links = this.setupLinks(this.filtered.links, "note");
    this.nodes = this.createNodeGroup(this.filtered.nodes, "note");

    this.tagLinks = this.setupLinks(this.filtered.tagLinks, "tag");
    this.tagNodes = this.createNodeGroup(this.filtered.tagNodes, "tag");
  }

  setupZoom() {
    const width = this.svg.node().getBoundingClientRect().width;
    const height = this.svg.node().getBoundingClientRect().height;

    const zoom = d3
      .zoom()
      .scaleExtent([this.config.zoom.min, this.config.zoom.max])
      .on("zoom", (event) => {
        this.zoomGroup.attr("transform", event.transform);
      });

    this.svg
      .call(zoom)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(this.config.zoom.defaultScale),
      );
  }


  // From link data, create link visualization and setup simulation force
  setupLinks(links, type) {
    let container = this.zoomGroup
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", this.config.link.stroke)
      .attr("stroke-opacity", this.config.link.opacity)
      .attr("stroke-width", 2);

    // Pull force between two nodes
    this.simulation.force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.path)
        .strength(this.config.force.linkForce)
        .distance(this.config.force.linkDistance),
    );

    // Update position on tick
    this.simulation.on("tick.links." + type, () => {
      container
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
    });

    return container;

  }

  createNodeGroup(nodes, nodeType) {
    const container = this.zoomGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g");

    container
      .append("circle")
      .attr(
        "r",
        (d) =>
          this.config.node.baseRadius +
          d.connections * this.config.node.radiusMultiplier,
      )
      .attr("fill", this.config.node.color[nodeType].fill);

    // Add labels to nodes with updated positioning and color
    container
      .append("text")
      .attr(
        "dy",
        (d) =>
          this.config.node.baseRadius +
          d.connections * this.config.node.radiusMultiplier +
          this.config.node.textYOffset,
      )
      .attr("text-anchor", "middle") // Center the text below the node
      .style("fill", this.config.node.textColor) // Set text color
      .style("font-size", this.config.node.fontSize)
      .attr("hidden", null)
      .text((d) => d.title);

    // Add tooltips
    container
      .append("title")
      .text((d) => `${d.title}\nConnections: ${d.connections}`);


    this.simulation.on("tick.nodes." + nodeType, () => {
      container.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    this.setupNodeInteractions(container, nodeType);
    return container;
  }

  getConnectedNodes(sourceNode) {
    const connected = new Set();

    this.data.links.forEach((link) => {
      if (link.source.path === sourceNode.path) {
        connected.add(link.target.path);
      } else if (link.target.path === sourceNode.path) {
        connected.add(link.source.path);
      }
    });

    this.data.tagLinks.forEach((link) => {
      if (link.source.path === sourceNode.path) {
        connected.add(link.target.path);
      } else if (link.target.path === sourceNode.path) {
        connected.add(link.source.path);
      }
    });

    return connected;
  }

  getConnectedLinks(sourceNode) {
    const connectedLinks = new Set();

    this.data.links.forEach((link) => {
      if (
        link.source.path === sourceNode.path ||
        link.target.path === sourceNode.path
      ) {
        connectedLinks.add(link);
      }
    });

    this.data.tagLinks.forEach((link) => {
      if (
        link.source.path === sourceNode.path ||
        link.target.path === sourceNode.path
      ) {
        connectedLinks.add(link);
      }
    });
    if (connectedLinks.length == 0) {
      return null
    }

    return connectedLinks;
  }

  setupNodeInteractions(container, nodeType) {
    // Create drag behavior
    const drag = d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // if hovering over the circle
    container
      .call(drag);

    container.on("mouseover", (event, d) => {
      if (event.target.tagName !== "circle") return;

      const connectedNodes = this.getConnectedNodes(d);
      const connectedLinks = this.getConnectedLinks(d);

      // Dim all nodes initially
      this.zoomGroup
        .selectAll(".nodes g")
        .style(
          "transition",
          `opacity ${this.config.node.transitionDuration}ms`,
        )
        .style("opacity", this.config.node.dimOpacity)
        .select("circle")
        .style("transition", `fill ${this.config.node.transitionDuration}ms`);
      // .style("fill", d.active);

      // Highlight connected nodes
      this.zoomGroup
        .selectAll(".nodes g")
        .filter((n) => n.path === d.path || connectedNodes.has(n.path))
        .style(
          "transition",
          `opacity ${this.config.node.transitionDuration}ms`,
        )
        .style("opacity", this.config.node.highlightOpacity)
        .select("circle")
        .style("transition", `fill ${this.config.node.transitionDuration}ms`)
        .style("fill", (n) => this.config.node.color[n.type].highlightFill);

      // // Show text for hovered node
      // d3.select(event.currentTarget).select("text").attr("hidden", null);

      // Dim all links
      this.zoomGroup
        .selectAll(".links line")
        .style(
          "transition",
          `opacity ${this.config.link.transitionDuration}ms, stroke ${this.config.link.transitionDuration}ms, stroke-width ${this.config.link.transitionDuration}ms`,
        )
        .style("opacity", this.config.link.dimOpacity)
        .style("stroke", this.config.link.stroke)
        .style("stroke-width", 1);

      // Highlight connected links
      this.zoomGroup
        .selectAll(".links line")
        .filter((l) => connectedLinks.has(l))
        .style(
          "transition",
          `opacity ${this.config.link.transitionDuration}ms, stroke ${this.config.link.transitionDuration}ms, stroke-width ${this.config.link.transitionDuration}ms`,
        )
        .style("opacity", this.config.link.highlightOpacity)
        .style("stroke", this.config.link.highlightStroke)
        .style("stroke-width", 2);
    })
      .on("mouseout", (event) => {
        // Only trigger if leaving the circle
        if (event.target.tagName !== "circle") return;
        // Reset all nodes
        this.zoomGroup
          .selectAll(".nodes g")
          .style(
            "transition",
            `opacity ${this.config.node.transitionDuration}ms`,
          )
          .style("opacity", this.config.node.highlightOpacity)
          .select("circle")
          .style("transition", `fill ${this.config.node.transitionDuration}ms`)
          .style("fill", (d) => d.inactive);

        // // Hide all text
        // this.zoomGroup
        //   .selectAll("text")
        //   // .style(
        //   //   "transition",
        //   //   `opacity ${CONFIG.node.transitionDuration}ms, font-size ${CONFIG.node.transitionDuration}ms`,
        //   // )
        //   .attr("hidden", true);

        // Reset all links
        this.zoomGroup
          .selectAll(".links line")
          .style(
            "transition",
            `opacity ${this.config.link.transitionDuration}ms, stroke ${this.config.link.transitionDuration}ms, stroke-width ${this.config.link.transitionDuration}ms`,
          )
          .style("opacity", this.config.link.opacity)
          .style("stroke", this.config.link.stroke)
          .style("stroke-width", 1);
      })
      .on("click", this.handleNodeClick);
  }

  handleNodeClick(event) {
    const file = event.srcElement.__data__.absPath;
    const request = new XMLHttpRequest();
    request.open("GET", "http://localhost:3000/api/open?file=" + file, false);
    request.send();
  }

}

