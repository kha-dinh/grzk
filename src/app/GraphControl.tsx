"use client";

import React, { useState, useEffect } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  GripVertical,
  Minimize2,
  Maximize2,
  ChevronsUpDown,
  Sun,
  Moon,
} from "lucide-react";
import { defaultConfig, GraphConfig } from "./graphConfig";
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
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

const GraphControlCollapsible = ({
  children,
  openSection,
  title,
  sectionName,
  toggleSection,
}: {
  children: any;
  openSection: boolean;
  title: string;
  sectionName: string;
  toggleSection: (arg: string) => void;
}) => {
  return (
    <div className="py-2">
      <Collapsible
        open={openSection}
        onOpenChange={() => {
          toggleSection(sectionName);
        }}
        className="w-full"
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{title}</h4>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid pl-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const ConfigControl = ({
  tags,
  config,
  filter,
  onConfigUpdate,
  onFilterUpdate,
  onShowTitle,
  showTitle,
}: {
  showTitle: boolean;
  onConfigUpdate: any;
  config: GraphConfig;
  filter: GraphFilter;
  onFilterUpdate: any;
  onShowTitle: any;
  tags?: Map<string, TagData>;
}) => {
  const { theme, setTheme } = useTheme();
  const [position, setPosition] = useState(
    tryGetStored("configPosition", { x: 20, y: 20 }),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  interface Map {
    [key: string]: boolean;
  }

  const [expandedSections, setExpandedSections] = useState<Map>({
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
    window.localStorage.setItem("configPosition", JSON.stringify(position));
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

  const handleSliderChange = <Category extends keyof GraphConfig>(
    category: Category,
    parameter: string,
    value: number,
  ) => {
    const newConfig = {
      ...config,
      [category]: {
        ...config[category],
        [parameter]: value,
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

  const onFilterStringUpdate = (newFilter: string) => {
    onFilterUpdate({ ...filter, filterString: newFilter });
  };

  const onShowTagsUpdate = (newVal: boolean) => {
    onFilterUpdate({ ...filter, showTags: newVal });
  };

  const handleTagSelect = (newTags: Option[]) => {
    let newSet = [
      ...new Set([...newTags.map((t) => JSON.stringify(t))])
        .values()
        .map((v) => JSON.parse(v)),
    ];
    onFilterUpdate({ ...filter, tags: newSet });
  };

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
        className="absolute shadow-lg  backdrop-blur-sm"
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
            className="p-1  rounded"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-4 pb-8">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  theme === "dark" ? setTheme("light") : setTheme("dark")
                }
                size="sm"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <Button variant="outline" onClick={handleReset} size="sm">
                Reset default
              </Button>
            </div>
            <div className="space-y-2 flex space-x-4 justify-between items-center">
              <Label className="font-semibold text-sm">Show titles</Label>
              <Switch
                id="show-text"
                checked={showTitle}
                onCheckedChange={onShowTitle}
              />
            </div>
            <div className="space-y-2 flex space-x-4 justify-between items-center">
              <Label className="font-semibold text-sm">Show tags</Label>
              <Switch
                id="show-text"
                checked={filter.showTags}
                onCheckedChange={onShowTagsUpdate}
              />
            </div>

            <GraphControlCollapsible
              openSection={expandedSections.filter}
              toggleSection={toggleSection}
              sectionName="filter"
              title="Filter"
            >
              <div className="grid gap-2">
                <Input
                  type="text"
                  placeholder="Title"
                  value={filter.filterString}
                  onChange={(e) => onFilterStringUpdate(e.target.value)}
                  className="w-full h-8 text-sm"
                />
                <MultipleSelector
                  options={processedTags}
                  onChange={handleTagSelect}
                  placeholder="Select tag(s)"
                  value={filter.tags}
                  className="w-full h-fit text-sm"
                ></MultipleSelector>
              </div>
            </GraphControlCollapsible>

            <GraphControlCollapsible
              openSection={expandedSections.force}
              toggleSection={toggleSection}
              title="Force"
              sectionName="force"
            >
              <Label className="block text-xs mb-2 mt-2">
                Center Force: {config.force.centerForce}
              </Label>
              <Slider
                max={1}
                step={0.1}
                value={[config.force.centerForce]}
                onValueChange={(v) =>
                  handleSliderChange("force", "centerForce", v[0])
                }
                className="w-full"
              />

              <Label className="block text-xs mb-2 mt-2">
                Repel Force: {config.force.repelForce}
              </Label>
              <Slider
                min={-5000}
                max={0}
                step={50}
                value={[config.force.repelForce]}
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
                value={[config.force.linkForce]}
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
                value={[config.force.linkDistance]}
                onValueChange={(v) =>
                  handleSliderChange("force", "linkDistance", v[0])
                }
                className="w-full"
              />
            </GraphControlCollapsible>
            <GraphControlCollapsible
              openSection={expandedSections.nodes}
              toggleSection={toggleSection}
              title="Nodes"
              sectionName="nodes"
            >
              <Label className="block text-xs mb-2">
                Radius: {config.node.baseRadius}
              </Label>
              <Slider
                min={5}
                max={30}
                step={1}
                value={[config.node.baseRadius]}
                onValueChange={(v) =>
                  handleSliderChange("node", "baseRadius", v[0])
                }
                className="w-full"
              />
            </GraphControlCollapsible>
            <GraphControlCollapsible
              openSection={expandedSections.zoom}
              toggleSection={toggleSection}
              title="Zoom"
              sectionName="zoom"
            >
              <Label className="block text-xs mb-2">
                Zoom: {config.zoom.defaultScale}
              </Label>
              <Slider
                min={config.zoom.min}
                max={config.zoom.max}
                step={0.05}
                value={[config.zoom.defaultScale]}
                onValueChange={(v) =>
                  handleSliderChange("zoom", "defaultScale", v[0])
                }
                className="w-full"
              />
            </GraphControlCollapsible>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ConfigControl;
