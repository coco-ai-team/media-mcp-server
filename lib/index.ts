import MCPServer from './server.js'
import { ConcatVideoTool, HelloWorldTool } from './tools.js'

export default async function MCPServerFactory(name: string, version: string) {
  return () =>
    new MCPServer(
      {
        name,
        version,
      },
      [new ConcatVideoTool(), new HelloWorldTool()],
    )
}
