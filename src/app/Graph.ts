import createFuzzySearch, { FuzzySearcher } from "@nozbe/microfuzz";
import { FillConfig, GraphConfig, NodeConfig } from "./graphConfig";
import * as d3 from "d3";
import { Option } from "@/components/ui/multi-select";

// How we identify unique nodes and edges
type NodeIdx = string;
type EdgeIdx = [srcPath: string, dstPath: string];

// {
// "title":"mzvuhqa8",
// "href":"mzvuhqa8",
// "type":"wiki-link",
// "isExternal":false,
// "rels":[],
// "snippet":"Related: [[mzvuhqa8]]",
// "snippetStart":404,
// "snippetEnd":425,
// "sourceId":379,
// "sourcePath":"qm27b0lh.md",
// "targetId":378,
// "targetPath":"mzvuhqa8.md"
// }

class ZkEdge implements d3.SimulationLinkDatum<ZkNode> {
  // title: string = ""
  // href: string = ""
  // type: string = ""
  // isExternal: boolean = false
  // rels: string[] = []
  // snippet: strsing = ""
  // sippetStart: number = 0
  // sippetend: number = 0
  // sourceId: number = 0
  source: ZkNode;
  // targetId: number = 0
  target: ZkNode;

  type: ZkEdgeType;

  constructor(
    source: ZkNode,
    target: ZkNode,
    type: ZkEdgeType = ZkEdgeType.LINK,
  ) {
    this.source = source;
    this.target = target;
    this.type = type;
  }
  idx(): EdgeIdx {
    return [this.source.path, this.target.path];
  }
}

export type GraphFilter = {
  filterString?: string;
  tags?: Option[];
  fuzzySearch: FuzzySearcher<ZkNode>;
};

// {
// "filename":"3eot91og.md",
// "filenameStem":"3eot91og",
// "path":"3eot91og.md",
// "absPath":"/Users/khadd/mynotes/3eot91og.md",
// "title":"(Virtualized) I/O Security",
// "link":"[[3eot91og]]",
// "lead":"#virtualization #security In",
// "body":"#virtualization #security In\n\n## Threats\n\n### DMA attacks\n\nMost devices are capable performing DMA, which may be used to corrupt kernel\nmemory if the device is buggy or controlled by attackers.\n\n### Malicious peripherals\n\nCertain devices are more easily corruptible than than others. For example, it is\nunlikely for PCI-e devices to be corrupted, but USB/bluetooth devices are easily\nplugged into the system, and can be easily manufactured.\n\nHowever, in confidential computing scenario, devices are provided by the\nuntrusted hypervisor, which must be assume to be unsafe.\n\n### Virtualized IO\n\nVirtualized I/O adds more complexity to I/O security. For confidential VMs,\naccess control of hardware devices becomes more complicated. There is now a\nthree-way concerns. Aside from isolation of VM from host, cross VM, now the host\nmust also be prevented from accessing devices assigned to a CVM.\n\nVirtualized I/O faces a fundamental challenge between performance and security.\nThat is, allowing the VM to directly access to the hardware device (i.e., the\nI/O memory regions) enables great performances. However, the devices might be\nprogrammed to perform malicious accesses. It may use DMA to illegally access\nhost memory and also memory of other VMs.\n\n## Isolation for security\n\nThe IOMMU and related hardware allows the hypervisor to isolate device's DMA\naccesses [[hxm4jt6e]].\n\nRISC-V have a potentially more scalable protection model with a PKU-like domains\n[@feng2024siopmp].\n\nRelated:\n\n- [[8qvweuj8]]\n- [[hxm4jt6e]]\n\n## Filtering for security\n\nEven with IOMMU isolation, devices can still attack the kernel through malicious\npackets (more of an interface attack [[yef2w9yc]]). This is more concerning for\nbluetooth and USB devices that are easily pluggable. Another approach for\nsecurity to install packet filters to check for malformed packets\n[@tian2019lbm].","snippets":["#virtualization #security In"],"rawContent":"# (Virtualized) I/O Security\n\n#virtualization #security In\n\n## Threats\n\n### DMA attacks\n\nMost devices are capable performing DMA, which may be used to corrupt kernel\nmemory if the device is buggy or controlled by attackers.\n\n### Malicious peripherals\n\nCertain devices are more easily corruptible than than others. For example, it is\nunlikely for PCI-e devices to be corrupted, but USB/bluetooth devices are easily\nplugged into the system, and can be easily manufactured.\n\nHowever, in confidential computing scenario, devices are provided by the\nuntrusted hypervisor, which must be assume to be unsafe.\n\n### Virtualized IO\n\nVirtualized I/O adds more complexity to I/O security. For confidential VMs,\naccess control of hardware devices becomes more complicated. There is now a\nthree-way concerns. Aside from isolation of VM from host, cross VM, now the host\nmust also be prevented from accessing devices assigned to a CVM.\n\nVirtualized I/O faces a fundamental challenge between performance and security.\nThat is, allowing the VM to directly access to the hardware device (i.e., the\nI/O memory regions) enables great performances. However, the devices might be\nprogrammed to perform malicious accesses. It may use DMA to illegally access\nhost memory and also memory of other VMs.\n\n## Isolation for security\n\nThe IOMMU and related hardware allows the hypervisor to isolate device's DMA\naccesses [[hxm4jt6e]].\n\nRISC-V have a potentially more scalable protection model with a PKU-like domains\n[@feng2024siopmp].\n\nRelated:\n\n- [[8qvweuj8]]\n- [[hxm4jt6e]]\n\n## Filtering for security\n\nEven with IOMMU isolation, devices can still attack the kernel through malicious\npackets (more of an interface attack [[yef2w9yc]]). This is more concerning for\nbluetooth and USB devices that are easily pluggable. Another approach for\nsecurity to install packet filters to check for malformed packets\n[@tian2019lbm].\n","wordCount":283,"
// tags":["virtualization","security"],"metadata":{},
// "created":"2024-11-30T05:08:40.72322004Z",
// "modified":"2024-12-20T06:24:45.512185645Z",
// "checksum":"f222499d2c28a068798b067cd06adb5bd8be43eada3c1ec9c8d649783e2bfc16"
// }

enum ZkEdgeType {
  LINK = "link",
  TAG = "tag",
}

export enum ZkNodeType {
  NOTE = "note",
  TAG = "tag",
}

class ZkNode implements d3.SimulationNodeDatum {
  // Data from ZK
  data?: any;
  path: string;
  // Custom
  type: ZkNodeType = ZkNodeType.NOTE;

  // Numbers of in/out edges
  inEdges: number = 0;
  outEdges: number = 0;

  config: NodeConfig;

  radius: number;
  fill: FillConfig;

  index?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
  vx?: number | undefined;
  vy?: number | undefined;
  fx?: number | null | undefined;
  fy?: number | null | undefined;

  constructor(
    path: string,
    type: ZkNodeType = ZkNodeType.NOTE,
    data: any,
    config: NodeConfig,
  ) {
    this.path = path;
    this.type = type;
    this.data = data;
    this.config = config;
    this.radius = config.baseRadius;
    this.fill = config.color[type];

    if (this.data) {
      if (this.data.title.length > 60) {
        this.data.title = this.data.title.slice(0, 60) + "...";
      }
    }
  }
  setInEdges(n: number) {
    this.inEdges = n;
    this.radius =
      this.config.baseRadius +
      this.config.baseRadius * this.config.radiusMultiplier * n;
  }
  id() {
    return this.path;
  }

  idx(): NodeIdx {
    return this.path;
  }
}

// {"id":93,"kind":"tag","name":"DB","noteCount":1},
// {"id":92,"kind":"tag","name":"DBs","noteCount":1}

export type RawData = {
  // We maintain two copies because d3 mutate one of them
  links: { sourcePath: string; targetPath: string }[];
  notes: { path: string }[];
};
export type TagData = {
  nodes: string[];
};

class ZkGraph {
  nodes: Map<NodeIdx, ZkNode> = new Map();
  edges: Map<EdgeIdx, ZkEdge> = new Map();
  tags: Map<string, TagData> = new Map();
  config: GraphConfig;

  _filteredNodes?: ZkNode[];

  filter: GraphFilter;
  // filterString?: string;
  // tagFilter?: Option[];

  constructor(rawData: RawData, config: GraphConfig) {
    this.config = config;

    rawData.notes.forEach((n) => {
      let newNode = new ZkNode(n.path, ZkNodeType.NOTE, n, config.node);
      this.nodes.set(newNode.path, newNode);
    });

    rawData.links.forEach((l) => {
      const srcNode = this.nodes.get(l.sourcePath);
      const targetNode = this.nodes.get(l.targetPath);
      let newEdge = new ZkEdge(srcNode!, targetNode!, ZkEdgeType.LINK);
      this.edges.set(newEdge.idx(), newEdge);
    });
    // rawData.links.map((l: ZkEdge) => {
    //   let newEdge = new ZkEdge();
    //   Object.assign(newEdge, {
    //     ...l,
    //     type: ZkEdgeType.LINK
    //   });
    //
    //   return newEdge;
    // });

    // Calculate in and out connection
    this.edges.forEach((edge) => {
      // let count: { [path: string]: number }
      this.nodes.forEach((node) => {
        if (node.path === edge.source.path) {
          node.outEdges++;
        }

        if (node.path === edge.target.path) {
          // NOTE: this also update radius
          node.setInEdges(node.inEdges + 1);
        }
      });
    });

    // Construct tags based on existing data
    this.nodes.forEach((node) => {
      if (node.data.tags) {
        node.data.tags.forEach((t: string) => {
          let tagData = this.tags.get(t);
          if (tagData) tagData.nodes.push(node.id());
          else {
            let tagData: TagData = { nodes: [] };
            tagData.nodes.push(node.id());
            this.tags.set(t, tagData);
          }
        });
      }
    });

    this.tags.forEach((tagData, tag) => {
      let tagNode = new ZkNode(
        tag,
        ZkNodeType.TAG,
        { title: tag },
        config.node,
      );
      // Add tag nodes to graph
      this.nodes.set(tagNode.path, tagNode);

      // And edges too
      tagData.nodes.forEach((nodeId) => {
        const taggedNode = this.nodes
          .values()
          .find((node) => node.id() == nodeId);
        if (!taggedNode) return;

        let tagEdge = new ZkEdge(taggedNode, tagNode, ZkEdgeType.TAG);
        this.edges.set(tagEdge.idx(), tagEdge);
        tagNode.setInEdges(tagNode.inEdges + 1);
      });
    });

    const searcher = createFuzzySearch(
      [...this.nodes.values()].filter((n) => n.type != ZkNodeType.TAG),
      {
        getText: (item) => [item.data.title],
      },
    );
    this.filter = {
      fuzzySearch: searcher,
    };
  }

  getTags() {
    return this.tags;
  }
  getLinks() {
    return [
      ...this.edges.values().filter((edge) => edge.type === ZkEdgeType.LINK),
    ];
  }

  // setTagFilter(newFilter?: Option[]) {
  //   if (!newFilter || newFilter.length == 0) {
  //     this.tagFilter = undefined;
  //   } else {
  //     this.tagFilter = newFilter;
  //   }
  // }
  setFilter(newFilter: GraphFilter) {
    // Object.assign(this.filter, newFilter);
    if (newFilter?.filterString === "") this.filter.filterString = undefined;
    else this.filter.filterString = newFilter.filterString;

    if (newFilter?.tags?.length == 0) this.filter.tags = undefined;
    else this.filter.tags = newFilter?.tags;
    // this.setFilterString(newFilter.filterString);
    // this.setTagFilter(newFilter.tags);
  }
  // setFilterString(newFilter: string) {
  //   if (newFilter === "") {
  //     this.filterString = undefined;
  //   } else {
  //     this.filterString = newFilter;
  //   }
  // }

  applyFilters(nodes: ZkNode[]) {
    let filteredNodes = nodes;
    if (this.filter.filterString) {
      filteredNodes = [
        ...this.filter.fuzzySearch(this.filter.filterString).map((n) => n.item),
        ...this.nodes.values().filter((n) => n.type == ZkNodeType.TAG),
      ];
    }
    if (this.filter.tags) {
      filteredNodes = filteredNodes.filter((node) => {
        return this.filter.tags!.some((tag) => {
          if (node.type == ZkNodeType.NOTE)
            return node.data.tags.includes(tag.value);
          if (node.type == ZkNodeType.TAG) return node.path === tag.value;
        });
      });
    }

    this._filteredNodes = filteredNodes;
    return filteredNodes;
  }
  getAllNodes() {
    let selectedNodes = [...this.nodes.values()];
    return this.applyFilters(selectedNodes);
  }

  getAllLinks() {
    let selectedEdges = this.edges
      .values()
      .filter(
        (e) =>
          this._filteredNodes!.includes(e.source) &&
          this._filteredNodes!.includes(e.target),
      );
    let edges = [...selectedEdges];
    return edges;
  }

  getNotes() {
    return [
      ...this.nodes.values().filter((node) => node.type === ZkNodeType.NOTE),
    ];
  }

  getConnectedNotes(node: ZkNode) {
    return [
      ...new Set(
        this.edges
          .values()
          .map((edge) => {
            if (edge.source == node) {
              return edge.target;
            }
            if (edge.target == node) {
              return edge.source;
            }
          })
          .filter((n) => n),
      ),
    ];
  }

  getConnectedEdges(node: ZkNode) {
    return [
      ...new Set(
        this.edges.values().filter((edge) => {
          return edge.source == node || edge.target == node;
        }),
      ),
    ];
  }

  findNotesWithTag(tag: string) {
    return this.getNotes().filter((node) => {
      return node.data.tags!.includes(tag);
    });
  }

  findNode(path: string) {
    return this.nodes.values().find((node) => {
      return node.id() === path;
    });
  }
}
export { ZkNode, ZkEdge, ZkGraph };
