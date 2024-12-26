"use client";

import { useFuzzySearchList, Highlight } from '@nozbe/microfuzz/react'
import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import ConfigControl from "./GraphControl";
import { defaultConfig } from "./graphConfig.ts";
import createFuzzySearch from '@nozbe/microfuzz';

class GraphVisualizer {
  constructor(svg, config, rawData, tags) {
    this.svg = svg;
    this.config = config;
    this.rawData = rawData;
    this.tags = tags;
    this.simulation = null;
    this.zoomGroup = null;
    this.nodes = null;
    this.links = null;
  }

  async initialize(filter) {
    try {
      const processedData = this.processGraphData(this.rawData, this.tags);
      this.setupSimulation(processedData);
      this.createVisualization(processedData);
      this.setupZoom();
    } catch (error) {
      console.error("Failed to initialize graph:", error);
    }
  }

  filterNodes(filter) {
    // console.log(filter)
    if (!filter) {
      // Not much to do 
      this.nodes.attr("hidden", null);
      this.links.attr("hidden", null);
      this.setupSimulationTick(this.nodes, this.links);
      return;
    }
    const tagNodes =
      this.nodes.filter((d) => d.type == "tag").nodes().map((item) => item.__data__);
    const fuzzySearch = createFuzzySearch(
      this.nodes.filter((d) => d.type != "tag").nodes()
      , {
        // search by `name` property
        // key: "title",
        // search by `description.text` property
        getText: (item) => [item.__data__.title],
        // search by multiple properties:
        // getText: (item) => [item.name, item.description.text]
      })


    let selectedNodes = fuzzySearch(filter).map((item) => item.item.__data__);
    // console.log(tagNodes)
    selectedNodes = selectedNodes.concat(tagNodes)

    // Links that are hidden
    let filteredLinks = new Set();

    this.nodes
      .filter((d) => !selectedNodes.includes(d))
      .attr("hidden", true)
      .each((d) => {
        // Hide connected links
        this.links
          .filter((link) =>
            link.source.path === d.path || link.target.path === d.path
          )
          .attr("hidden", true)
          .each((link) => filteredLinks.add(link));
      });

    const newNodes = this.nodes
      .filter((d) => selectedNodes.includes(d))
      .attr("hidden", null);
    const newLinks = this.links
      .filter((link) => !filteredLinks.has(link))
      .attr("hidden", null);
    const selectedLinks = newLinks.nodes().map((item) => item.__data__);
    // this.nodes.remove();
    // this.links.remove();

    // this.simulation.stop()
    // this.setupSimulation({ nodes: selectedNodes, links: selectedLinks });
    // this.setupSimulationTick(newNodes, newLinks);
    // console.log(filter)
    // console.log(selectedNodes);

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

    let nodes = rawData.notes.map((note) => ({
      ...note,
      type: "note",
      connections: connectionCounts[note.path] || 0,
      active: this.config.node.highlightFill,
      inactive: this.config.node.fill,
    }));

    // }

    tags.map((tag) => {
      const tagLinks = rawData.notes.filter((note) =>
        note.tags.includes(tag.name),
      );

      // NOTE: We link nodes base on their path
      const tagNode = {
        title: tag.name,
        connections: tagLinks.length,
        type: "tag",
        id: 999,
        path: tag.name,
        active: this.config.node.tagHighlightFill,
        inactive: this.config.node.tagFill,
      };
      nodes.push(tagNode);
      tagLinks.map((note) => {
        // console.log(note);
        links.push({
          source: tagNode.path,
          target: note.path,
        });
      });
    });

    // console.log(rawData.links);
    // console.log(links);
    // console.log(nodes);
    // console.log(tags);

    return { nodes, links };
  }

  setupSimulation(data) {
    // Calculate the maximum number of connections for normalization
    const maxConnections = Math.max(
      ...data.nodes.map((node) => node.connections),
    );

    this.simulation = d3
      .forceSimulation(data.nodes)
      // Center force - pulls nodes toward the center, stronger for well-connected nodes
      .force(
        "x",
        d3.forceX().strength((d) => {
          // Normalize connections to get a value between 0 and 1
          const connectionStrength = d.connections / maxConnections;
          // More connections = stronger pull to center
          return this.config.force.centerForce * (1 + connectionStrength);
        }),
      )
      .force(
        "y",
        d3.forceY().strength((d) => {
          const connectionStrength = d.connections / maxConnections;
          return this.config.force.centerForce * (1 + connectionStrength);
        }),
      )

      // Repel force - pushes nodes away from each other
      .force(
        "charge",
        d3.forceManyBody().strength(this.config.force.repelForce),
      )

      // Link force - maintains connections between nodes
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d) => d.path)
          .strength(this.config.force.linkForce)
          .distance(this.config.force.linkDistance),
      );

    // These x and y forces are now handled in the center force above

    // Adjust simulation parameters for stability
    this.simulation
      .alphaDecay(0.02) // Slower cooling
      .velocityDecay(0.2) // More momentum
      .alpha(1)
      .restart();
  }

  createVisualization(data) {
    this.zoomGroup = this.svg.append("g").attr("class", "zoom-group");

    // Store references to nodes and links
    this.links = this.createLinks(data.links);
    this.nodes = this.createNodeGroups(data.nodes);

    this.setupSimulationTick(this.nodes, this.links);
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

  createLinks(links) {
    return this.zoomGroup
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", this.config.link.stroke)
      .attr("stroke-opacity", this.config.link.opacity)
      .attr("stroke-width", 2);
  }

  createNodeGroups(nodes) {
    const container = this.zoomGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g");

    // Add circles to nodes
    container
      .filter((d) => d.type == "note")
      .append("circle")
      .attr(
        "r",
        (d) =>
          this.config.node.baseRadius +
          d.connections * this.config.node.radiusMultiplier,
      )
      .attr("fill", this.config.node.fill);

    container
      .filter((d) => d.type == "tag")
      .append("circle")
      .attr(
        "r",
        (d) =>
          this.config.node.baseRadius +
          d.connections * this.config.node.radiusMultiplier,
      )
      .attr("fill", this.config.node.tagFill);

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
      .attr("hidden", true)
      .text((d) => d.title);

    // Add tooltips
    container
      .append("title")
      .text((d) => `${d.title}\nConnections: ${d.connections}`);

    this.setupNodeInteractions(container);
    return container;
  }

  getConnectedNodes(sourceNode) {
    const connected = new Set();
    const links = this.simulation.force("link").links();

    links.forEach((link) => {
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
    const links = this.simulation.force("link").links();

    links.forEach((link) => {
      if (
        link.source.path === sourceNode.path ||
        link.target.path === sourceNode.path
      ) {
        connectedLinks.add(link);
      }
    });

    return connectedLinks;
  }

  setupNodeInteractions(container) {
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

    container
      .call(drag)
      .on("mouseover", (event, d) => {
        // Only trigger if hovering over the circle
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
          .style(
            "transition",
            `fill ${this.config.node.transitionDuration}ms`,
          );
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
          .style(
            "transition",
            `fill ${this.config.node.transitionDuration}ms`,
          )
          .style("fill", (n) => n.active);

        // Show text for hovered node
        d3.select(event.currentTarget)
          .select("text")
          .attr("hidden", null);

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
          .style(
            "transition",
            `fill ${this.config.node.transitionDuration}ms`,
          )
          .style("fill", (d) => d.inactive);

        // Hide all text
        this.zoomGroup
          .selectAll("text")
          // .style(
          //   "transition",
          //   `opacity ${CONFIG.node.transitionDuration}ms, font-size ${CONFIG.node.transitionDuration}ms`,
          // )
          .attr("hidden", true);

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

  setupSimulationTick(nodeGroups, links) {
    this.simulation.on("tick", () => {
      nodeGroups.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

      links
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
    });
  }
}

function ZkGraph() {
  const [graphInstance, setGraphInstance] = useState(null);
  const refSvg = useRef(null)

  useEffect(() => {
    const svg = d3.select(refSvg.current);
    async function fetchData() {
      const fetchData = await d3.json("http://localhost:3000/api/graph");
      const fetchTags = await d3.json("http://localhost:3000/api/tag");
      // console.log(fetchData);
      // console.log(fetchTags);
      const newGraph = new GraphVisualizer(svg, defaultConfig, fetchData, fetchTags);
      newGraph.initialize();
      setGraphInstance(newGraph);
    }
    fetchData();
    return () => { };
  }, [])

  const handleConfigUpdate = (newConfig) => {
    if (!graphInstance) return;

    graphInstance.simulation
      .force("x", d3.forceX().strength(newConfig.force.centerForce))
      .force("y", d3.forceY().strength(newConfig.force.centerForce))
      .force("charge", d3.forceManyBody().strength(newConfig.force.repelForce))
      .force(
        "link",
        graphInstance.simulation
          .force("link")
          .strength(newConfig.force.linkForce)
          .distance(newConfig.force.linkDistance),
      );

    // graphInstance.zoomGroup
    //   .selectAll(".nodes circle")
    //   .attr(
    //     "r",
    //     (d) =>
    //       newConfig.node.baseRadius +
    //       d.connections * newConfig.node.radiusMultiplier,
    //   );

    // Restart simulation
    graphInstance.simulation.alpha(0.3).restart();
  };


  const handleFilterUpdate = (newFilter) => {
    graphInstance.filterNodes(newFilter);
  }

  return (
    <>
      <ConfigControl onConfigUpdate={handleConfigUpdate} onFilterUpdate={handleFilterUpdate} />
      <div className="graph-container">
        <svg
          ref={refSvg}
          style={{
            height: "100vh",
            width: "100%",
            position: "fixed",
            backgroundColor: defaultConfig.background.color,
            top: 0,
            left: 0,
          }}
        >
          <g className="plot-area" />
          <g className="x-axis" />
          <g className="y-axis" />
        </svg>
      </div>
    </>
  );
}

export default ZkGraph;
