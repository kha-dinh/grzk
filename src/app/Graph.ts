

// How we identify unique nodes and edges
type NodeIdx = [path: string, type: ZkNodeType];
type EdgeIdx = [srcPath: string, dstPath: string, type: ZkEdgeType];

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


class ZkEdge {

  // title: string = ""
  // href: string = ""
  // type: string = ""
  // isExternal: boolean = false
  // rels: string[] = []
  // snippet: strsing = ""
  // sippetStart: number = 0
  // sippetend: number = 0
  // sourceId: number = 0
  source: string
  // targetId: number = 0
  target: string

  type: ZkEdgeType

  // Positions
  x1: number = 0
  x2: number = 0
  y1: number = 0
  y2: number = 0


  constructor(source: string, target: string, type: ZkEdgeType = ZkEdgeType.LINK) {
    this.source = source;
    this.target = target;
    this.type = type;
  }
  idx(): EdgeIdx {
    return [this.source, this.target, this.type]
  }
}

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
  TAG = "tag"
}

enum ZkNodeType {
  NOTE = "note",
  TAG = "tag"
}

class ZkNode {
  // Data from ZK
  data?: any
  path: string
  // Custom 
  type: ZkNodeType = ZkNodeType.NOTE

  // Numbers of in/out edges
  inEdge: number = 0
  outEdge: number = 0
  // Positions
  x: number = 0
  y: number = 0

  constructor(path: string, type: ZkNodeType = ZkNodeType.NOTE, data: any) {
    this.path = path;
    this.type = type
    this.data = data
  }
  id() {
    return this.path;
  }

  idx(): NodeIdx {
    return [this.path, this.type];
  }

};


// {"id":93,"kind":"tag","name":"DB","noteCount":1},
// {"id":92,"kind":"tag","name":"DBs","noteCount":1}

type RawData = {
  links: { sourcePath: string, targetPath: string }[]
  notes: { path: string }[]
}
class TagData {
  nodes: String[] = []
}

export default class ZkGraph {
  nodes: Map<NodeIdx, ZkNode> = new Map();
  edges: Map<EdgeIdx, ZkEdge> = new Map();
  tags: Map<string, TagData> = new Map();

  constructor(rawData: RawData) {

    rawData.notes.forEach((n) => {
      let newNode = new ZkNode(n.path, ZkNodeType.NOTE, n);
      this.nodes.set([newNode.id(), ZkNodeType.NOTE], newNode)
    });

    rawData.links.forEach((l) => {
      let newEdge = new ZkEdge(l.sourcePath, l.targetPath, ZkEdgeType.LINK);
      this.edges.set(
        newEdge.idx(),
        newEdge)
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
        if (node.path === edge.source) {
          node.outEdge++;
        };

        if (node.path === edge.target) {
          node.inEdge++;
        };
      })
    });

    // Construct tags based on existing data
    this.nodes.forEach((node) => {

      if (node.data.tags) {
        node.data.tags.forEach((t: string) => {
          let tagData = this.tags.get(t)
          if (tagData)
            tagData.nodes.push(node.id())
          else {
            tagData = new TagData();
            tagData.nodes.push(node.id())
            this.tags.set(t, tagData)
          }
        })
      }

    });

    this.tags.forEach((tagData, tag) => {
      let tagNode = new ZkNode(tag, ZkNodeType.TAG, { title: tag });
      // Add tag nodes to graph
      this.nodes.set([tagNode.id(), ZkNodeType.TAG], tagNode);

      // And edges too
      tagData.nodes.forEach((nodeId) => {
        const taggedNode = this.nodes.values().find((node) => node.id() == nodeId)
        if (!taggedNode)
          return;
        let tagEdge = new ZkEdge(taggedNode.path, tagNode.path, ZkEdgeType.TAG);
        this.edges.set(tagEdge.idx(), tagEdge);
      })
    });

  }

  getLinks() {
    return [...this.edges.values().filter((edge) => edge.type === ZkEdgeType.LINK)];
  }

  getNotes() {
    return [...this.nodes.values().filter((node) => node.type === ZkNodeType.NOTE)];
  }

  findNotesWithTag(tag: string) {
    return this.getNotes().filter((node) => {
      return node.data.tags!.includes(tag);
    })
  }

  findNode(path: string) {
    return this.nodes.values().find((node) => {
      return node.id() === path;
    })
  }

}
