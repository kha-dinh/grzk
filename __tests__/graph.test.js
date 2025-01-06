import ZkGraph from "../src/app/Graph.ts"

import { expect, jest, test } from '@jest/globals';


const TEST_NOTES =
{
  "notes": [
    {
      "filename": "nhovug1d.md", "filenameStem": "nhovug1d", "path": "nhovug1d.md", "absPath": "/Users/khadd/mynotes/nhovug1d.md", "title": "Address translation / virtual memory overheads", "link": "[[nhovug1d]]", "lead": "#os #architecture", "body": "", "snippets": ["#os #architecture"], "rawContent": "", "wordCount": 214,
      "tags": ["os", "architecture"], "metadata": {}, "created": "2024-12-20T06:24:45.545899257Z", "modified": "2024-12-20T06:24:45.545993217Z", "checksum": "39f033b4974e6d7e587696413ce4c33c24223b845838fde32cee516d182f284b"
    },
    {
      "filename": "1rqx4xia.md", "filenameStem": "1rqx4xia", "path": "1rqx4xia.md", "absPath": "/Users/khadd/mynotes/1rqx4xia.md", "title": "Bits in page table entries", "link": "[[1rqx4xia]]", "lead": "#os #architecture", "body": "", "snippets": ["#os #architecture"], "rawContent": "# Bits in page table entries\n#os #architecture\n\n\n# Present flag\nThe *present* flag indicates that there exists a backing physical frame for this page table entry. If the present bit is not set, a page fault will be triggered.\n\n\n# Access and dirty flags\nOn x86, bit 5 is the *accessed* flag, and bit 6 is the *dirty* flag.\n\nThe _accessed_ flag is set when a page is accessed by the CPU during address translation. The *dirty* flag is set when a page is written by the CPU. \n\nAfter being set, these flags need to be cleared by the software.\n\nThe dirty bit indicates that page must be written to the disk before the frame can be reused for other pages. Else, the page content is unchanged, so it is safe to reuse the page [standford-paging].\n\n# References\n- @2023intel\n- [standford-paging](https://web.stanford.edu/~ouster/cgi-bin/cs140-winter16/lecture.php?topic=paging)\n", "wordCount": 143,
      "tags": ["os", "architecture"], "metadata": {}, "created": "2023-08-09T13:49:43.459966637Z", "modified": "2023-08-09T13:49:43.460009845Z", "checksum": "d72e515f4683595e686ffd79b9de17de60fc9da1ecde62ce05d9883bbaaaa04d"
    },
    {
      "filename": "zw0lj520.md", "filenameStem": "zw0lj520", "path": "zw0lj520.md", "absPath": "/Users/khadd/mynotes/zw0lj520.md", "title": "CAP-VMs: Capability-Based Isolation and Sharing in the Cloud", "link": "[[zw0lj520]]", "lead": "#literature #capabilities #vm #os #cheri #ipc #libos #container\n[@sartakov2022capvms]", "body": "", "snippets": [""], "rawContent": "", "wordCount": 312,
      "tags": ["os", "capabilities", "vm", "container", "ipc", "literature", "cheri", "libos"], "metadata": {}, "created": "2023-08-09T13:49:43.470603963Z", "modified": "2024-06-22T05:12:48.051126199Z", "checksum": "12af0359fbee28f55d3539cc0ae8df016d12b271fbe9e38d459292f5efbf01bb"
    },
    {
      "filename": "68nms906.md", "filenameStem": "68nms906", "path": "68nms906.md", "absPath": "/Users/khadd/mynotes/68nms906.md", "title": "Confidential I/O Taxes", "link": "[[68nms906]]", "lead": "#tee #os #io", "body": "#tee #os #io\n\nThere are overheads for using I/O in TEEs due to several factors.\n\n## CVMs\n\nI/O in CVMs are predominantly performed through the `virtio` paravirtualized\ndrivers due to its performance [@li2023bifrost].\n\nEven then, there are certain \"taxes\" that slow down the I/O performance in CVMs.\n\n### Bounce buffering\n\nSince the host cannot directly access the private memory of the CVM, bounce\nbuffers located in shared memory [[jj89s7vj]] must be maintained by the _guest_.\nTo send any packets to the hardware, the guest must copy the data from its\nprivate memory into the bounce buffer, and the host must maps the bounce buffer\ninto the device (NIC) for it to perform DMA. The reversed direction is the\nsimilar. This contributes 19.45% of CPU cycles [@li2023bifrost]\n\n[@li2023bifrost] noticed that TLS itself must perform memory copies during\nencryption and decryption, and requiring private memory and decryption at the\nsame time is not optimal. An optimization that directly decrypt data into shared\nmemory and encrypt data from shared memory into private is added.\n\n### VMExits\n\nVMExits is known to be more expensive on CVMs compared to normal VMs\n[[eczmc02q]], since it have to encrypt VM states and perform security checks.\nAsynchronous interrupt posting mechansisms supported by hardware kind of make\nthis less of an issue [@li2023bifrost].\n\n### Packet processing\n\nPacket processing is another major cost, but this is not unique to confidential\nI/O. Still, one optimization can be made to _reassemble packets_ in the\nhost-side backend driver into larger packets [@li2023bifrost].\n\n### Non-CVM costs\n\nMore: [[471vf8vr]].", "snippets": ["#tee #os #io"], "rawContent": "", "wordCount": 258,
      "tags": ["os", "tee", "io"], "metadata": {}, "created": "2024-11-30T04:50:41.597391159Z", "modified": "2024-12-20T06:24:45.515846683Z", "checksum": "007304609fd9d04000dbe606c2db58e4c06156626fee49b665f7bb68e3f0eb13"
    },
    {
      "filename": "h3manv25.md", "filenameStem": "h3manv25", "path": "h3manv25.md", "absPath": "/Users/khadd/mynotes/h3manv25.md", "title": "Containers vs. Virtual machines", "link": "[[h3manv25]]", "lead": "#vm #container #cloud #ipc #os #virtualization", "body": "#vm #container #cloud #ipc #os #virtualization\n\nContainers and virtual machines ([[s16ct1rj]]) are two main isolation primitives\nwhen it come to cloud isolation.\n\nVirtual machines provides strong isolation between application components with a\nsmall TCB: a small hypervisor need to be trusted. However, data sharing between\nVMs is challenging and commonly have high overheads [@yasukata2023exitless].\n\nOn the other hand, containers allows application components to share the\nunderlying OS. This enable richer OS-backed IPC mechanisms for better data\nsharing. This comes at the cost of larger TCB: a shared OS have to implement\nnamespace isolation and complex IPC primitives [@sartakov2022capvms].", "snippets": ["#vm #container #cloud #ipc #os #virtualization"], "rawContent": "# Containers vs. Virtual machines\n\n#vm #container #cloud #ipc #os #virtualization\n\nContainers and virtual machines ([[s16ct1rj]]) are two main isolation primitives\nwhen it come to cloud isolation.\n\nVirtual machines provides strong isolation between application components with a\nsmall TCB: a small hypervisor need to be trusted. However, data sharing between\nVMs is challenging and commonly have high overheads [@yasukata2023exitless].\n\nOn the other hand, containers allows application components to share the\nunderlying OS. This enable richer OS-backed IPC mechanisms for better data\nsharing. This comes at the cost of larger TCB: a shared OS have to implement\nnamespace isolation and complex IPC primitives [@sartakov2022capvms].\n", "wordCount": 103,
      "tags": ["os", "virtualization", "vm", "container", "cloud", "ipc"], "metadata": {}, "created": "2023-08-09T13:49:43.468262955Z", "modified": "2024-06-22T05:12:48.045309456Z", "checksum": "df9f62867e1f7ef381057ed68aa3256cd12cdd9ad7fb13ee1cbe730b193c1bf9"
    }
  ],
  "links": [
    { // In edge
      "title": "h3manv25",
      "href": "h3manv25",
      "type": "wiki-link",
      "isExternal": false, "rels": [],
      "snippet": "",
      "snippetStart": 350,
      "snippetEnd": 463,
      "sourceId": 155,
      "sourcePath": "zw0lj520.md",
      "targetId": 60,
      "targetPath": "h3manv25.md"
    },
    { // Out edge
      "title": "zw0lj520",
      "sourcePath": "h3manv25.md",
      "targetPath": "zw0lj520.md"
    },
    { // Second outedge
      "title": "68mns906",
      "sourcePath": "h3manv25.md",
      "targetPath": "68mns906.md"
    }

  ]
}


test("Test graph import", () => {
  // Test that graph is imported sucessfully
  const graph = new ZkGraph(TEST_NOTES)
  // console.log(graph.nodes)
  console.log(graph.tags)
  console.log(graph.edges)

  expect(graph.getLinks().length).toBe(3);
  expect(graph.getNotes().length).toBe(5);
  expect(graph.tags.size).toBe(13);

  expect(graph.findNotesWithTag("os").length).toBe(5);
  expect(graph.findNotesWithTag("virtualization").length).toBe(1);

  let node = graph.findNode("h3manv25.md")
  expect(node);
  expect(node.outEdge).toBe(2);
  expect(node.inEdge).toBe(1);
})

