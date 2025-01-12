"use client";

import { useFuzzySearchList, Highlight } from "@nozbe/microfuzz/react";
import React, { useState, useEffect } from "react";
import * as d3 from "d3";
import ConfigControl from "./GraphControl";
import { GraphConfig, defaultConfig } from "./graphConfig";
import D3Graph from "./D3Graph";
import { GraphFilter, RawData, ZkGraph, ZkNode, ZkNodeType } from "./Graph";
import { tryGetStored } from "./Utils";

function Graph() {
  const [graph, setGraph] = useState<ZkGraph | undefined>(undefined);
  const [config, setConfig] = useState(tryGetStored("config", defaultConfig));
  const [showTitle, setShowTitle] = useState(tryGetStored("showTitle", true));
  const [filter, setFilter] = useState<GraphFilter>(
    tryGetStored("filter", null),
  );

  useEffect(() => {
    localStorage.setItem("config", JSON.stringify(config));
  }, [config]);
  useEffect(() => {
    localStorage.setItem("filter", JSON.stringify(filter));
  }, [filter]);

  useEffect(() => {
    async function fetchData() {
      const fetchData: RawData | undefined = await d3.json(
        "http://localhost:3000/api/graph",
      );

      const graph = new ZkGraph(fetchData!, config);
      if (filter) {
        graph.filter = filter;
      }
      setGraph(graph);

    }
    fetchData();
  }, []);

  const handleConfigUpdate = (newConfig: GraphConfig) => {
    setConfig(newConfig);
  };

  const handleZoomUpdate = (scale: number) => {
    let newConfig: GraphConfig = {
      ...config,
      zoom: {
        ...config.zoom,
        defaultScale: scale
      }
    }
    setConfig(newConfig);
  };

  const handleNodeSelect = (event: any) => {
    const node: ZkNode = event.srcElement.__data__;
    switch (node.type) {
      case ZkNodeType.NOTE:
        let file = node.data.absPath
        if (file) {
          const request = new XMLHttpRequest();
          request.open("GET", "http://localhost:3000/api/open?file=" + file, false);
          request.send();
        } else {
          console.log(`File for ${node.path} not found`);
        }
        break;
      case ZkNodeType.TAG:
        // let newTags = [{ value: node.path, label: node.path }]
        // handleTagSelect(newTags);
        break;

    }

  }

  const handleFilterUpdate = (newFilter) => {
    graph!.filter = newFilter;
    setFilter(newFilter);
  };

  return (
    graph ?
      <>
        <ConfigControl
          showTitle={showTitle}
          onShowTitle={setShowTitle}
          config={config}
          filter={filter}
          onConfigUpdate={handleConfigUpdate}
          onFilterUpdate={handleFilterUpdate}
          tags={graph.getTags()}
        />
        <D3Graph
          config={config}
          filter={filter}
          graph={graph}
          showTitle={showTitle}
          onScaleUpdate={handleZoomUpdate}
          onNodeSelect={handleNodeSelect}
        ></D3Graph>
      </> : <></>
  );
}

export default Graph;
