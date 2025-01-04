"use client";

import { useFuzzySearchList, Highlight } from "@nozbe/microfuzz/react";
import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import ConfigControl from "./GraphControl";
import { defaultConfig } from "./graphConfig.ts";
import createFuzzySearch from "@nozbe/microfuzz";
import { GraphVisualizer } from "./D3Graph"


function ZkGraph() {
  const [graphInstance, setGraphInstance] = useState(null);
  const [tags, setTags] = useState([]);
  const refSvg = useRef(null);

  useEffect(() => {
    const svg = d3.select(refSvg.current);
    async function fetchData() {
      const fetchData = await d3.json("http://localhost:3000/api/graph");
      const fetchTags = await d3.json("http://localhost:3000/api/tag");
      // console.log(fetchData);
      // console.log(fetchTags);
      const newGraph = new GraphVisualizer(
        svg,
        defaultConfig,
        fetchData,
        fetchTags,
      );
      setTags(fetchTags)
      newGraph.initialize();
      setGraphInstance(newGraph);
    }
    fetchData();
    return () => { };
  }, []);

  const handleConfigUpdate = (newConfig) => {
    graphInstance.config = newConfig;
    graphInstance.setupSimulation();
    graphInstance.createVisualization();
    graphInstance.setupZoom();
  };

  const handleFilterUpdate = (newFilter) => {
    graphInstance.filter = newFilter
    graphInstance.applyFilter();
    graphInstance.setupSimulation();
    graphInstance.createVisualization();
    graphInstance.setupZoom();
  };

  const handleTagSelect = (newTags) => {
    console.log(newTags)
    graphInstance.tagFilter = newTags
    graphInstance.applyFilter();
    graphInstance.setupSimulation();
    graphInstance.createVisualization();
    graphInstance.setupZoom();
  };


  return (
    <>
      <ConfigControl
        onConfigUpdate={handleConfigUpdate}
        onFilterUpdate={handleFilterUpdate}
        tags={tags}
        onTagSelect={handleTagSelect}
      />
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
