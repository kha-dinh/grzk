"use client";
import React, { useState, useEffect } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  GripVertical,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import { defaultConfig, FillConfig, GraphConfig } from "./graphConfig";
import MultipleSelector, { Option } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

import { GraphFilter, TagData } from "./Graph";
import { tryGetStored } from "./Utils";

const ConfigControl = ({
  tags,
  config,
  filter,
  onConfigUpdate,
  onFilterUpdate,
  onTagSelect,
}: {
  onConfigUpdate: any;
  config: GraphConfig;
  filter: GraphFilter;
  onFilterUpdate: any;
  tags?: Map<string, TagData>;
  onTagSelect: any;
}) => {
  const [position, setPosition] = useState(
    tryGetStored("configPosition", { x: 20, y: 20 }),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    force: true,
    nodes: true,
    zoom: true,
    filter: true,
  });

  let processedTags: Option[] = [];
  if (tags)
    processedTags = [
      ...tags.entries().map(([d, data]) => {
        return { value: d, label: d, count: data.nodes.length };
      }),
    ]
      .sort((a, b) => b.count - a.count)
      .map((d) => {
        return { value: d.value, label: d.label };
      });

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("configPosition", JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e: any) => {
    if (e.target.closest(".handle")) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault(); // Prevent text selection while dragging
    }
  };

  const handleMouseMove = (e: any) => {
    if (isDragging) {
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 320, e.clientX - dragOffset.x),
      );
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - 100, e.clientY - dragOffset.y),
      );

      setPosition({
        x: newX,
        y: newY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  const handleReset = () => {
    onConfigUpdate(defaultConfig);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // useEffect(() => {
  //   async function fetchData() {
  //     const fetchTags = await d3.json("http://localhost:3000/api/tag");
  //     const tags = fetchTags
  //       .map((d) => { return { ...d, value: d.name, label: d.name }; })
  //       .sort((a, b) => b.noteCount - a.noteCount);
  //     setTags(tags);
  //   }
  //   fetchData();
  //   return () => { };
  // }, [])

  const handleSliderChange = (
    category: string,
    parameter: string,
    value: string,
  ) => {
    const newConfig = {
      ...config,
      [category]: {
        ...config[category],
        [parameter]: parseFloat(value),
      },
    };
    // setConfig(newConfig);
    onConfigUpdate(newConfig);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const SectionHeader = ({ children, title, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex items-center gap-1 w-full hover:bg-gray-50 p-1 rounded select-none"
    >
      {expandedSections[section] ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
      <h3 className="font-medium text-sm">{title}</h3>
    </button>
  );

  const GraphControlCollapsible = ({ children, section, title }) => (
    <Collapsible
      open={expandedSections[section]}
      onOpenChange={() => {
        toggleSection(section);
      }}
      className="w-full space-y-2"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between space-x-4 px-4">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );

  const CollapsibleHeader = ({ children }) => (
    <div className="flex items-center justify-between space-x-4 px-4">
      <h4 className="text-sm font-semibold">{children}</h4>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-9 p-0">
          <ChevronsUpDown className="h-4 w-4" />
          <span className="sr-only">Toggle</span>
        </Button>
      </CollapsibleTrigger>
    </div>
  );
  return (
    <div
      className="fixed"
      style={{
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <Card
        suppressHydrationWarning
        className="absolute shadow-lg bg-white/95 backdrop-blur-sm"
        style={{
          left: position.x,
          top: position.y,
          width: "320px",
          pointerEvents: "auto",
        }}
      >
        <CardHeader
          className="handle cursor-grab active:cursor-grabbing p-2 flex flex-row items-center justify-between select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1">
            <GripVertical className="w-4 h-4" />
            <CardTitle>Graph Configuration</CardTitle>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-4">
            <Button
              variant="outline"
              onClick={handleReset}
              size="sm"
              className="center px-4"
            >
              Reset to Defaults
            </Button>
            <div className="space-y-4">
              <div className="space-y-2">
                <Collapsible
                  open={expandedSections.force}
                  onOpenChange={() => {
                    toggleSection("force");
                  }}
                  className="w-full space-y-2"
                >
                  <CollapsibleHeader>Force</CollapsibleHeader>
                  <CollapsibleContent className="space-y-2">
                    <div className="grid gap-2 pl-6">
                      <Label className="block text-xs mb-2">
                        Center Force: {config.force.centerForce}
                      </Label>
                      <Slider
                        max={1}
                        step={0.1}
                        defaultValue={[config.force.centerForce]}
                        onValueChange={(v) =>
                          handleSliderChange("force", "centerForce", v[0])
                        }
                        className="w-full"
                      />
                      <Label className="block text-xs mb-2">
                        Repel Force: {config.force.repelForce}
                      </Label>
                      <Slider
                        min={-1000}
                        max={0}
                        step={50}
                        defaultValue={[config.force.repelForce]}
                        onValueChange={(v) =>
                          handleSliderChange("force", "repelForce", v[0])
                        }
                        className="w-full"
                      />
                      <Label className="block text-xs mb-2">
                        Link Force: {config.force.linkForce}
                      </Label>
                      <Slider
                        max={1}
                        step={0.1}
                        defaultValue={[config.force.linkForce]}
                        onValueChange={(v) =>
                          handleSliderChange("force", "linkForce", v[0])
                        }
                        className="w-full"
                      />
                      <Label className="block text-xs mb-2">
                        Link Distance: {config.force.linkDistance}
                      </Label>
                      <Slider
                        min={10}
                        max={200}
                        step={5}
                        defaultValue={[config.force.linkDistance]}
                        onValueChange={(e) =>
                          handleSliderChange("force", "linkDistance", e[0])
                        }
                        className="w-full"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible
                  open={expandedSections.filter}
                  onOpenChange={() => {
                    toggleSection("filter");
                  }}
                  className="w-full space-y-2"
                >
                  <CollapsibleHeader>Filter</CollapsibleHeader>
                  <CollapsibleContent>
                    <div className="grid gap-2 pl-6">
                      <Input
                        type="text"
                        placeholder="Title"
                        value={filter?.filterString}
                        onChange={(e) => onFilterUpdate(e.target.value)}
                        className="w-full h-8"
                      />
                      <MultipleSelector
                        options={processedTags}
                        onChange={onTagSelect}
                        placeholder="Select tag(s)"
                        value={filter?.tags}
                      ></MultipleSelector>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <Collapsible
                open={expandedSections.nodes}
                onOpenChange={() => {
                  toggleSection("nodes");
                }}
                className="w-full space-y-2"
              >
                <CollapsibleHeader>Nodes</CollapsibleHeader>
              </Collapsible>
              <div className="space-y-2">
                <SectionHeader title="Nodes" section="nodes" />
                {expandedSections.nodes && (
                  <div className="grid gap-2 pl-6">
                    <div>
                      <Label className="block text-xs mb-1">
                        Base Radius: {config.node.baseRadius}
                      </Label>
                      <Slider
                        min={2}
                        max={20}
                        step={1}
                        defaultValue={[config.node.baseRadius]}
                        onValueChange={(e) =>
                          handleSliderChange("node", "baseRadius", e[0])
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Radius Multiplier: {config.node.radiusMultiplier}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={config.node.radiusMultiplier}
                        onChange={(e) =>
                          handleSliderChange(
                            "node",
                            "radiusMultiplier",
                            e.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <SectionHeader title="Zoom" section="zoom" />
                {expandedSections.zoom && (
                  <div className="pl-6">
                    <label className="block text-xs mb-1">
                      Default Scale: {config.zoom.defaultScale}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={config.zoom.defaultScale}
                      onChange={(e) =>
                        handleSliderChange(
                          "zoom",
                          "defaultScale",
                          e.target.value,
                        )
                      }
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ConfigControl;
