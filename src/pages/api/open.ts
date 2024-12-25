import type { NextApiRequest, NextApiResponse } from 'next'
import { spawnSync, spawn } from "child_process";
import { defaultConfig } from 'app/graphConfig';

export const config = {
  api: {
    responseLimit: false,
  },
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const path = req.query["file"]
  if (typeof path == "string") {

    console.log(`Opening: ${path?.toString()} with ${defaultConfig.opener.program}...`);
    let result = spawn(
      defaultConfig.opener.program,
      [
        path?.toString()
      ],
    )
    result.on('error', () => { console.log("can't open file"); });
  }
  // var out = JSON.parse(zk.stdout.toString());
  res.status(200).json({})
}
