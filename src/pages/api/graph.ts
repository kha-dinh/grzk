import type { NextApiRequest, NextApiResponse } from 'next'
import { spawnSync } from "child_process";

export const config = {
  api: {
    responseLimit: false,
  },
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const zk = spawnSync(
    "zk",
    [
      "graph",
      "--format", "json",
    ],
    { maxBuffer: 1024 * 4096 }
  )
  var out = JSON.parse(zk.stdout.toString());
  res.status(200).json(out);
}
